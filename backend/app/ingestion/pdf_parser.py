"""
PDF Parser — extract structured project data from government PDF documents.

Handles:
- Tender documents (NIT)
- DPR (Detailed Project Reports)
- Completion certificates
- CAG audit reports
"""
import re
import logging
from typing import Optional, Dict, Any
from pathlib import Path

import pdfplumber

logger = logging.getLogger(__name__)

# Regex patterns for common Indian government PDF fields
PATTERNS = {
    "project_name": [
        r"(?:Name of Work|Project Name|Work Name)\s*[:\-]\s*(.+?)(?:\n|$)",
        r"(?:SUBJECT|Re)\s*[:\-]\s*(.+?)(?:\n|$)",
    ],
    "tender_id": [
        r"(?:Tender No|NIT No|Tender ID|Reference No)\s*[:\-]\s*([A-Z0-9/\-]+)",
    ],
    "estimated_cost": [
        r"(?:Estimated Cost|Approximate Value|Contract Value)\s*[:\-]\s*(?:Rs\.?|INR|₹)?\s*([\d,\.]+)\s*(?:Lakh|Crore|CR|L)?",
    ],
    "start_date": [
        r"(?:Date of Commencement|Start Date|Work Commencement)\s*[:\-]\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
    ],
    "end_date": [
        r"(?:Date of Completion|Completion Date|End Date|Due Date)\s*[:\-]\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
    ],
    "contractor": [
        r"(?:Name of Contractor|Awarded to|Contractor Name)\s*[:\-]\s*(.+?)(?:\n|$)",
    ],
    "authority": [
        r"(?:Executing Agency|Department|Authority)\s*[:\-]\s*(.+?)(?:\n|$)",
    ],
    "district": [
        r"(?:District|Dist\.?)\s*[:\-]\s*([A-Za-z\s]+?)(?:\n|,|$)",
    ],
}


def _parse_indian_date(date_str: str) -> Optional[str]:
    """Convert DD/MM/YYYY or DD-MM-YYYY to YYYY-MM-DD."""
    if not date_str:
        return None
    for sep in ["/", "-", "."]:
        parts = date_str.split(sep)
        if len(parts) == 3:
            d, m, y = parts
            if len(y) == 2:
                y = "20" + y
            try:
                return f"{y}-{int(m):02d}-{int(d):02d}"
            except ValueError:
                continue
    return None


def _parse_indian_currency(amount_str: str, unit_str: str = "") -> Optional[float]:
    """
    Convert Indian currency strings to absolute INR.
    e.g., '15.5 Crore' → 155000000.0
    """
    if not amount_str:
        return None
    clean = amount_str.replace(",", "").strip()
    try:
        amount = float(clean)
    except ValueError:
        return None

    unit = unit_str.upper()
    if "CRORE" in unit or "CR" in unit:
        return amount * 1_00_00_000
    elif "LAKH" in unit or "LAC" in unit:
        return amount * 1_00_000
    elif "THOUSAND" in unit:
        return amount * 1000
    return amount


def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract all text from a PDF file."""
    text = ""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        logger.error(f"PDF extraction failed for {pdf_path}: {e}")
    return text


def extract_tables_from_pdf(pdf_path: str) -> list:
    """Extract tabular data from PDFs (e.g., milestone tables)."""
    tables = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for i, page in enumerate(pdf.pages):
                page_tables = page.extract_tables()
                for table in page_tables:
                    tables.append({
                        "page": i + 1,
                        "data": table,
                    })
    except Exception as e:
        logger.error(f"Table extraction failed: {e}")
    return tables


def parse_project_from_text(text: str) -> Dict[str, Any]:
    """
    Apply all regex patterns to extract structured fields.
    Returns a dict of extracted data.
    """
    extracted = {}

    for field, patterns in PATTERNS.items():
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if match:
                value = match.group(1).strip()
                # Clean up common noise
                value = re.sub(r"\s+", " ", value)
                value = value.rstrip(".")
                extracted[field] = value
                break

    # Post-process dates
    for date_field in ["start_date", "end_date"]:
        if date_field in extracted:
            extracted[date_field] = _parse_indian_date(extracted[date_field])

    # Post-process budget
    if "estimated_cost" in extracted:
        raw = extracted["estimated_cost"]
        # Detect unit from surrounding text
        unit_match = re.search(r"(Lakh|Crore|CR|L)\b", text[:text.find(raw) + 50], re.IGNORECASE)
        unit = unit_match.group(1) if unit_match else ""
        extracted["estimated_cost_inr"] = _parse_indian_currency(raw, unit)

    return extracted


async def extract_from_document(document_id: str) -> dict:
    """
    Full pipeline:
    1. Load document from DB
    2. Download PDF
    3. Extract text + tables
    4. Parse structured data
    5. Update document record with extracted_text
    """
    import httpx
    from app.core.database import AsyncSessionLocal
    from sqlalchemy import select, update
    from app.models.project import Document

    async with AsyncSessionLocal() as db:
        doc = (await db.execute(
            select(Document).where(Document.id == document_id)
        )).scalar_one_or_none()

        if not doc or not doc.file_url:
            return {"status": "not_found"}

        # Download PDF
        tmp_path = f"/tmp/infrasight_{document_id}.pdf"
        async with httpx.AsyncClient() as client:
            resp = await client.get(doc.file_url)
            with open(tmp_path, "wb") as f:
                f.write(resp.content)

        # Extract
        text = extract_text_from_pdf(tmp_path)
        parsed = parse_project_from_text(text)

        # Save extracted text back
        await db.execute(
            update(Document)
            .where(Document.id == document_id)
            .values(
                extracted_text=text[:50000],  # cap at 50k chars
                doc_metadata={**(doc.doc_metadata or {}), "parsed_fields": parsed}
            )
        )

    return {"status": "ok", "fields_extracted": list(parsed.keys())}
