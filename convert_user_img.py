import os
from PIL import Image

input_path = r"C:\Users\ASUS\Documents\GitHub\DIEMDANHNHANSUHR\assets\img\79b19471-0aa1-4dd5-827d-9303fbea6090.png"
output_path = r"C:\Users\ASUS\Documents\GitHub\DIEMDANHNHANSUHR\assets\img\autumn-bg.webp"

try:
    img = Image.open(input_path)
    img.save(output_path, "WEBP", quality=85)
    print(f"Successfully converted to {output_path}")
    
    # Remove old png
    os.remove(input_path)
    print("Removed original PNG")
except Exception as e:
    print(f"Error converting image: {e}")
