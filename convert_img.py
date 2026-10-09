from PIL import Image

input_path = r"C:\Users\ASUS\.gemini\antigravity\brain\446a8b5c-385c-4fe4-9b87-d5771d4a9e6e\.user_uploaded\media_1791572981131.jpg"
output_path = r"autumn-bg.webp"

try:
    img = Image.open(input_path)
    # Convert to webp with 80% quality
    img.save(output_path, "WEBP", quality=80)
    print(f"Successfully created {output_path}")
except Exception as e:
    print(f"Error: {e}")
