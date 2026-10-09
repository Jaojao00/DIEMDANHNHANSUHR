with open('app.js', 'r', encoding='utf-8') as f:
    text = f.read()
    with open('output.txt', 'w', encoding='utf-8') as out:
        out.write(f"Has Lương theo ngày công: {'Lương theo ngày công' in text}\n")
