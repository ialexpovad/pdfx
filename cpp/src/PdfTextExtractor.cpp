#include "PdfTextExtractor.hpp"
#include <podofo/podofo.h>
#include <sstream>
#include <stdexcept>

namespace {

  inline std::string PdfStringToUtf8(const PoDoFo::PdfString& ps) {
    auto v = ps.GetString();
    return std::string(v.data(), v.size());
  }

} // namespace

std::string PdfTextExtractor::toUtf8(const std::string& s) { return s; }

std::vector<std::string> PdfTextExtractor::extractAll(const std::string& pdfPath,
                                                      const ExtractOptions&) {
  PoDoFo::PdfMemDocument doc;
  doc.Load(pdfPath);
  auto& pages = doc.GetPages();
  const int pageCount = static_cast<int>(pages.GetCount());

  std::vector<std::string> out;
  out.reserve(pageCount);
  for (int i = 0; i < pageCount; ++i) {
    out.emplace_back(extractOnePage(doc, i, {}));
  }
  return out;
}

std::vector<std::string> PdfTextExtractor::extractPages(const std::string& pdfPath,
                                                        const std::vector<int>& pageIndices,
                                                        const ExtractOptions&) {
  PoDoFo::PdfMemDocument doc;
  doc.Load(pdfPath);
  auto& pages = doc.GetPages();
  const int pageCount = static_cast<int>(pages.GetCount());

  std::vector<std::string> out;
  out.reserve(pageIndices.size());
  for (int idx : pageIndices) {
    if (idx < 0 || idx >= pageCount) throw std::out_of_range("page index out of range");
    out.emplace_back(extractOnePage(doc, idx, {}));
  }
  return out;
}

std::string PdfTextExtractor::extractOnePage(PoDoFo::PdfMemDocument& doc,
                                             int pageIndex,
                                             const ExtractOptions&) {
  auto& pages = doc.GetPages();
  PoDoFo::PdfPage& page = pages.GetPageAt(static_cast<unsigned>(pageIndex));

  std::vector<PoDoFo::PdfTextEntry> entries;
  page.ExtractTextTo(entries);

  std::ostringstream out;
  for (const auto& e : entries) {
    out << e.Text << '\n';
  }
  return out.str();
}
