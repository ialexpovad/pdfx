#include <napi.h>
#include <vector>
#include <string>
#include "PdfTextExtractor.hpp"

namespace {

Napi::Error JsError(Napi::Env env, const std::exception& ex) {
  return Napi::Error::New(env, std::string("pdfx native error: ") + ex.what());
}

} // namespace

Napi::Value ExtractAll(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "Expected (string path)").ThrowAsJavaScriptException();
    return env.Null();
  }
  try {
    std::string path = info[0].As<Napi::String>().Utf8Value();
    PdfTextExtractor ex;
    auto pages = ex.extractAll(path);
    Napi::Array js = Napi::Array::New(env, pages.size());
    for (uint32_t i = 0; i < pages.size(); ++i) {
      js[i] = Napi::String::New(env, pages[i]);
    }
    return js;
  } catch (const std::exception& ex) {
    JsError(env, ex).ThrowAsJavaScriptException();
    return env.Null();
  }
}

Napi::Value ExtractPages(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 2 || !info[0].IsString() || !info[1].IsArray()) {
    Napi::TypeError::New(env, "Expected (string path, number[] pages)").ThrowAsJavaScriptException();
    return env.Null();
  }
  try {
    std::string path = info[0].As<Napi::String>().Utf8Value();
    auto arr = info[1].As<Napi::Array>();
    std::vector<int> pages; pages.reserve(arr.Length());
    for (uint32_t i = 0; i < arr.Length(); ++i) {
      pages.push_back(arr.Get(i).ToNumber().Int32Value());
    }
    PdfTextExtractor ex;
    auto out = ex.extractPages(path, pages);
    Napi::Array js = Napi::Array::New(env, out.size());
    for (uint32_t i = 0; i < out.size(); ++i) js[i] = Napi::String::New(env, out[i]);
    return js;
  } catch (const std::exception& ex) {
    JsError(env, ex).ThrowAsJavaScriptException();
    return env.Null();
  }
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("extractAll", Napi::Function::New(env, ExtractAll));
  exports.Set("extractPages", Napi::Function::New(env, ExtractPages));
  return exports;
}

NODE_API_MODULE(pdfx, Init)
