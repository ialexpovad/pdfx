#pragma once
#include <string>
#include <vector>

// forward declaration for use in function signatures
namespace PoDoFo { class PdfMemDocument; }

struct ExtractOptions {
  bool preserve_layout = false;
};

class PdfTextExtractor {
public:
  std::vector<std::string> extractAll(const std::string& pdfPath,
                                      const ExtractOptions& opts = {});

  std::vector<std::string> extractPages(const std::string& pdfPath,
                                        const std::vector<int>& pageIndices,
                                        const ExtractOptions& opts = {});

private:
  std::string extractOnePage(PoDoFo::PdfMemDocument& doc, int pageIndex,
                             const ExtractOptions& opts);

  static std::string toUtf8(const std::string& s);
};
