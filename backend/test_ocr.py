import pytesseract
from PIL import Image
import os

img_path = "/app/captcha.png"
if os.path.exists(img_path):
    img = Image.open(img_path)
    # Simple preprocessing: convert to grayscale
    img = img.convert('L')
    
    # Try different PSM modes
    text = pytesseract.image_to_string(img, config='--psm 6').strip()
    print(f"Extracted Captcha: {text}")
else:
    print("captcha.png not found")
