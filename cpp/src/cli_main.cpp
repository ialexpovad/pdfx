#include "PdfTextExtractor.hpp"
#include <iostream>
#include <fstream>
#include <sstream>

static void usage(const char* a0){
  std::cout << "Usage: " << a0 << " -i input.pdf [-o out.txt] [--pages 1-3,5] [--format txt|json]\n";
}

static std::vector<int> parse_pages(const std::string& spec) {
  std::vector<int> out; if (spec.empty()) return out;
  std::stringstream ss(spec); std::string t;
  while (std::getline(ss, t, ',')) {
    auto d = t.find('-');
    if (d == std::string::npos) out.push_back(std::stoi(t)-1);
    else {
      int a = std::stoi(t.substr(0,d)), b = std::stoi(t.substr(d+1));
      if (a>b) std::swap(a,b); for(int p=a;p<=b;++p) out.push_back(p-1);
    }
  }
  return out;
}

int main(int argc, char** argv){
  std::string in, outPath, fmt="txt", pagesSpec;
  for (int i=1;i<argc;++i) {
    std::string a=argv[i];
    if ((a=="-i"||a=="--input") && i+1<argc) in=argv[++i];
    else if ((a=="-o"||a=="--output") && i+1<argc) outPath=argv[++i];
    else if (a=="--format" && i+1<argc) fmt=argv[++i];
    else if (a=="--pages" && i+1<argc) pagesSpec=argv[++i];
    else if (a=="-h"||a=="--help") { usage(argv[0]); return 0; }
    else { usage(argv[0]); return 1; }
  }
  if (in.empty() || (fmt!="txt" && fmt!="json")) { usage(argv[0]); return 1; }

  try{
    PdfTextExtractor ex;
    auto pages = pagesSpec.empty() ? ex.extractAll(in) : ex.extractPages(in, parse_pages(pagesSpec));
    std::ostream* os=&std::cout; std::ofstream ofs;
    if(!outPath.empty()){ ofs.open(outPath, std::ios::binary); if(!ofs){ std::cerr<<"open "<<outPath<<" failed\n"; return 2;} os=&ofs; }

    if (fmt=="txt") {
      for (size_t i=0;i<pages.size();++i){ *os<<pages[i]; if(i+1<pages.size()) *os<<'\n'; }
    } else {
      *os << "{\n  \"pages\": [\n";
      for (size_t i=0;i<pages.size();++i){
        std::string s, esc; s=pages[i]; esc.reserve(s.size()+16);
        for(char c: s){ switch(c){ case '\\':esc+="\\\\";break; case '"':esc+="\\\"";break; case '\n':esc+="\\n";break; case '\r':esc+="\\r";break; case '\t':esc+="\\t";break; default: esc+=c; } }
        *os << "    {\"index\":"<<i<<",\"text\":\""<<esc<<"\"}" << (i+1<pages.size()? ",":"") << "\n";
      }
      *os << "  ]\n}\n";
    }
    return 0;
  } catch(const std::exception& e){ std::cerr<<"Error: "<<e.what()<<"\n"; return 3; }
}
