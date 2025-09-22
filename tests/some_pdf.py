# Create a minimal PDF file
from datetime import datetime
from pathlib import Path

def make_minimal_pdf(path: str):
    # Build a very small PDF 1.4 with one page and several text operators
    # Uses BaseFont /Helvetica (Type1), WinAnsi encoding; plain ASCII text.
    objs = []

    # 4: Font
    font_obj = b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
    objs.append(font_obj)

    # 5: Contents stream
    content_lines = [
        "BT",
        "/F1 16 Tf",
        "72 740 Td",
        "(PDFX Test — PoDoFo 1.x target) Tj",
        "0 -22 Td",
        "[(This ) 120 (is ) -50 (a TJ test.)] TJ",
        "0 -22 Td",
        "(He said \\(quote\\) and used single \\' too.) Tj",
        "0 -22 Td",
        "(Page 1 line 4) Tj",
        "ET",
    ]
    content_text = "\n".join(content_lines) + "\n"
    content_bytes = content_text.encode("latin-1", errors="replace")
    contents_obj = b"<< /Length " + str(len(content_bytes)).encode() + b" >>\nstream\n" + content_bytes + b"endstream"
    objs.append(contents_obj)

    # 3: Page (references font (obj 4 -> will be 1-based index after rearrange) and contents (obj 5))
    # We'll assign numbers later; temporarily put placeholders.
    # Resources: /Font << /F1 4 0 R >>
    # Contents: 5 0 R
    # MediaBox US Letter
    page_obj_template = b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>"
    # We'll fix numbers after we know ordering; but here we know ordering: 1 Catalog, 2 Pages, 3 Page, 4 Font, 5 Contents.
    page_obj = page_obj_template
    objs.insert(0, page_obj)  # will become object #3 after we insert catalog and pages later

    # 2: Pages (Count 1, Kids [3 0 R])
    pages_obj = b"<< /Type /Pages /Count 1 /Kids [3 0 R] >>"

    # 1: Catalog
    catalog_obj = b"<< /Type /Catalog /Pages 2 0 R >>"

    # Final ordering: 1 catalog, 2 pages, 3 page, 4 font, 5 contents
    final_objs = [catalog_obj, pages_obj] + objs  # objs currently [page, font, contents]

    # Assemble PDF with xref
    header = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"
    parts = [header]
    offsets = [0]  # object 0 free
    current_offset = len(header)

    for i, obj in enumerate(final_objs, start=1):
        obj_header = f"{i} 0 obj\n".encode()
        obj_footer = b"\nendobj\n"
        parts.append(obj_header)
        current_offset += len(obj_header)
        offsets.append(current_offset - len(obj_header))  # record start of this obj
        parts.append(obj)
        current_offset += len(obj)
        parts.append(obj_footer)
        current_offset += len(obj_footer)

    # xref
    xref_start = current_offset
    xref = ["xref\n", f"0 {len(final_objs)+1}\n", "0000000000 65535 f \n"]
    # format each offset as 10-digit, space, 5-digit gen (00000), space, 'n', newline
    running_offset = len(header)
    # We recorded offsets with an off-by-one; recompute correct offsets:
    # We need the byte offsets to the beginning of each "X 0 obj" line.
    # Let's rebuild to compute exact offsets instead.
    # Rebuild file fully to count byte positions accurately
    data = b"".join(parts)
    # Re-scan to compute offsets of each obj header pattern "\n{i} 0 obj\n" except for 1st where it starts right after header
    # Simpler: iterate again to assemble and compute exact offsets.
    parts2 = [header]
    offsets = [0]
    current_offset = len(header)
    for i, obj in enumerate(final_objs, start=1):
        obj_header = f"{i} 0 obj\n".encode()
        obj_footer = b"\nendobj\n"
        offsets.append(current_offset)  # start of "i 0 obj"
        parts2.append(obj_header); current_offset += len(obj_header)
        parts2.append(obj);         current_offset += len(obj)
        parts2.append(obj_footer);  current_offset += len(obj_footer)
    data = b"".join(parts2)
    xref_start = current_offset

    xref_lines = [b"xref\n", f"0 {len(final_objs)+1}\n".encode(), b"0000000000 65535 f \n"]
    for off in offsets[1:]:  # skip object 0
        xref_lines.append(f"{off:010d} 00000 n \n".encode())
    xref_bytes = b"".join(xref_lines)

    trailer = b"trailer\n<< /Size " + str(len(final_objs)+1).encode() + b" /Root 1 0 R >>\n"
    startxref = b"startxref\n" + str(xref_start).encode() + b"\n%%EOF\n"

    pdf_bytes = data + xref_bytes + trailer + startxref

    Path(path).write_bytes(pdf_bytes)

out_path = "some.pdf"
make_minimal_pdf(out_path)