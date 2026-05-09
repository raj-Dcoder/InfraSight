"""
Full-text + geo search endpoint.

GET /search?q=...&state=...&bbox=...
GET /search/map   - lightweight geo-only response for map pins
GET /search/suggest - autocomplete suggestions
"""
from typing import Optional
from uuid import UUID
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, text, cast
from sqlalchemy.dialects.postgresql import TSVECTOR

from app.core.database import get_db
from app.models.project import Project, ProjectCategory, ProjectStatus, VerificationStatus
from app.schemas.schemas import ProjectListItem, PaginatedResponse

router = APIRouter()


SORT_COLUMNS = {
    "created_at": Project.created_at,
    "updated_at": Project.updated_at,
    "title": Project.title,
    "sanctioned_budget_inr": Project.sanctioned_budget_inr,
    "physical_progress_pct": Project.physical_progress_pct,
}


def _compute_delay_days(project: Project) -> Optional[int]:
    end = project.revised_end_date or project.original_end_date
    if not end or project.status == ProjectStatus.COMPLETED:
        return None
    today = date.today()
    if today > end:
        return (today - end).days
    return 0


@router.get("", response_model=PaginatedResponse)
async def search_projects(
    q: Optional[str] = Query(None, description="Free-text search query"),
    state: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    category: Optional[ProjectCategory] = Query(None),
    status: Optional[ProjectStatus] = Query(None),
    verification_status: Optional[VerificationStatus] = Query(None),
    min_budget: Optional[float] = Query(None),
    max_budget: Optional[float] = Query(None),
    delayed_only: bool = Query(False),
    bbox_sw_lat: Optional[float] = Query(None),
    bbox_sw_lng: Optional[float] = Query(None),
    bbox_ne_lat: Optional[float] = Query(None),
    bbox_ne_lng: Optional[float] = Query(None),
    near_lat: Optional[float] = Query(None, description="Latitude for Near Me search"),
    near_lng: Optional[float] = Query(None, description="Longitude for Near Me search"),
    radius_km: float = Query(10.0, description="Radius in km for Near Me search"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at"),
    sort_dir: str = Query("desc", pattern="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db),
):
    """
    Unified search endpoint combining:
    - PostgreSQL full-text search (tsvector)
    - Geo bounding box filter (PostGIS)
    - Faceted filters
    """
    from sqlalchemy.orm import selectinload

    filters = []

    # Full-text search
    if q:
        ts_query = func.plainto_tsquery("english", q)
        ts_vector = func.to_tsvector(
            "english",
            func.concat_ws(
                " ",
                Project.title,
                Project.description,
                Project.city,
                Project.state,
                Project.address,
            )
        )
        filters.append(ts_vector.op("@@")(ts_query))

    if state:
        filters.append(Project.state.ilike(f"%{state}%"))
    if city:
        filters.append(Project.city.ilike(f"%{city}%"))
    if category:
        filters.append(Project.category == category)
    if status:
        filters.append(Project.status == status)
    if verification_status:
        filters.append(Project.verification_status == verification_status)
    if min_budget is not None:
        filters.append(Project.sanctioned_budget_inr >= min_budget)
    if max_budget is not None:
        filters.append(Project.sanctioned_budget_inr <= max_budget)
    if delayed_only:
        today = date.today()
        filters.append(
            and_(
                Project.status != ProjectStatus.COMPLETED,
                or_(
                    Project.revised_end_date < today,
                    and_(Project.revised_end_date.is_(None), Project.original_end_date < today),
                ),
            )
        )

    # Geo bounding box
    if all(v is not None for v in [bbox_sw_lat, bbox_sw_lng, bbox_ne_lat, bbox_ne_lng]):
        from geoalchemy2.functions import ST_MakeEnvelope, ST_Within
        bbox = ST_MakeEnvelope(bbox_sw_lng, bbox_sw_lat, bbox_ne_lng, bbox_ne_lat, 4326)
        filters.append(ST_Within(Project.location, bbox))

    # Near Me
    if near_lat is not None and near_lng is not None:
        from geoalchemy2.types import Geography
        from geoalchemy2.functions import ST_MakePoint, ST_SetSRID
        # ST_DWithin with geography uses meters
        pt = ST_SetSRID(ST_MakePoint(near_lng, near_lat), 4326)
        filters.append(func.ST_DWithin(cast(Project.location, Geography), cast(pt, Geography), radius_km * 1000))

    where = and_(*filters) if filters else True

    # Count
    total = (await db.execute(select(func.count(Project.id)).where(where))).scalar_one()

    # Rank by FTS relevance for plain text searches unless the caller chose a sort.
    if q and sort_by == "relevance":
        ts_query = func.plainto_tsquery("english", q)
        ts_vector = func.to_tsvector(
            "english",
            func.concat_ws(" ", Project.title, Project.description, Project.city, Project.state)
        )
        order = func.ts_rank(ts_vector, ts_query).desc()
    else:
        sort_col = SORT_COLUMNS.get(sort_by, Project.created_at)
        order = sort_col.desc() if sort_dir == "desc" else sort_col.asc()

    from sqlalchemy.orm import selectinload
    rows = (await db.execute(
        select(Project)
        .options(selectinload(Project.contractor), selectinload(Project.authority))
        .where(where)
        .order_by(order)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )).scalars().all()

    from geoalchemy2.shape import to_shape
    results = []
    for p in rows:
        lat, lng = None, None
        if p.location is not None:
            point = to_shape(p.location)
            lat, lng = point.y, point.x

        results.append(ProjectListItem(
            id=p.id, title=p.title, category=p.category, status=p.status,
            state=p.state, city=p.city, verification_status=p.verification_status,
            physical_progress_pct=p.physical_progress_pct,
            sanctioned_budget_inr=p.sanctioned_budget_inr,
            original_end_date=p.original_end_date, revised_end_date=p.revised_end_date,
            contractor_name=p.contractor.canonical_name if p.contractor else None,
            authority_name=p.authority.canonical_name if p.authority else None,
            lat=lat,
            lng=lng,
            delay_days=_compute_delay_days(p),
            created_at=p.created_at,
        ))

    return PaginatedResponse(
        total=total, page=page, page_size=page_size,
        pages=-(-total // page_size), results=results,
    )


@router.get("/map")
async def map_pins(
    state: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    category: Optional[ProjectCategory] = Query(None),
    status: Optional[ProjectStatus] = Query(None),
    verification_status: Optional[VerificationStatus] = Query(None),
    delayed_only: bool = Query(False),
    near_lat: Optional[float] = Query(None),
    near_lng: Optional[float] = Query(None),
    radius_km: float = Query(10.0),
    db: AsyncSession = Depends(get_db),
):
    """
    Lightweight endpoint returning only geo data for map rendering.
    Returns id, title, status, lat, lng.
    """
    from geoalchemy2.functions import ST_X, ST_Y
    filters = [Project.location.isnot(None)]
    if state:
        filters.append(Project.state.ilike(f"%{state}%"))
    if city:
        filters.append(Project.city.ilike(f"%{city}%"))
    if category:
        filters.append(Project.category == category)
    if status:
        filters.append(Project.status == status)
    if verification_status:
        filters.append(Project.verification_status == verification_status)
    if delayed_only:
        today = date.today()
        filters.append(
            and_(
                Project.status != ProjectStatus.COMPLETED,
                or_(
                    Project.revised_end_date < today,
                    and_(Project.revised_end_date.is_(None), Project.original_end_date < today),
                ),
            )
        )
    if near_lat is not None and near_lng is not None:
        from geoalchemy2.types import Geography
        from geoalchemy2.functions import ST_MakePoint, ST_SetSRID
        pt = ST_SetSRID(ST_MakePoint(near_lng, near_lat), 4326)
        filters.append(func.ST_DWithin(cast(Project.location, Geography), cast(pt, Geography), radius_km * 1000))

    rows = (await db.execute(
        select(
            Project.id,
            Project.title,
            Project.status,
            Project.category,
            Project.verification_status,
            ST_X(Project.location).label("lng"),
            ST_Y(Project.location).label("lat"),
        ).where(and_(*filters)).limit(5000)
    )).all()

    return [
        {
            "id": str(r.id),
            "title": r.title,
            "status": r.status,
            "category": r.category,
            "verification_status": r.verification_status,
            "lat": r.lat,
            "lng": r.lng,
        }
        for r in rows
    ]


@router.get("/suggest")
async def suggest(
    q: str = Query(..., min_length=2),
    db: AsyncSession = Depends(get_db),
):
    """Autocomplete suggestions for search bar."""
    rows = (await db.execute(
        select(Project.id, Project.title, Project.city, Project.state)
        .where(Project.title.ilike(f"%{q}%"))
        .limit(10)
    )).all()

    return [
        {"id": str(r.id), "title": r.title, "location": f"{r.city}, {r.state}"}
        for r in rows
    ]
