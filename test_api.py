import requests
import json

url = "https://script.google.com/macros/s/AKfycbwgdwkHnJcPURZerkrPkhbJUuGFb1qTOWEXft1OJQrphR36DVGeWVvzAUaZs_MPG4-R/exec?action=get_registration&empId=ops66909"
response = requests.get(url)

try:
    data = response.json()
    print("Fetched data length:", len(data))
    for d in data:
        print(f"Shift ID: {d.get('shiftId')}, Shift Label: {d.get('shiftLabel')}")
        print("Selections:", len(d.get('selections', [])))
except Exception as e:
    print("Error:", e)
    print("Response text:", response.text)
