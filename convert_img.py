from PIL import Image
import os

def convert_to_webp(filepath):
    try:
        img = Image.open(filepath)
        img.save(filepath, "WEBP", quality=80)
        print(f"Converted {filepath} to WEBP successfully.")
    except Exception as e:
        print(f"Error converting {filepath}: {e}")

convert_to_webp("C:\\Users\\ASUS\\Documents\\GitHub\\chamcongnhanvien.swsoc\\assets\\mid-autumn-bg.webp")
convert_to_webp("C:\\Users\\ASUS\\Documents\\GitHub\\DIEMDANHNHANSUHR\\assets\\mid-autumn-bg.webp")
