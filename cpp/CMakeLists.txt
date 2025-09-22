cmake_minimum_required(VERSION 3.21)
project(pdfx_core LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if(MSVC)
  add_compile_options(/W4 /permissive- /EHsc)
else()
  add_compile_options(-Wall -Wextra -Wpedantic -Werror=return-type)
endif()

add_library(pdfx STATIC src/PdfTextExtractor.cpp)
target_include_directories(pdfx PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/include)

list(APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_LIST_DIR}/../cmake")
include(FindOrFetchPoDoFo)

if (PDFX_PoDoFo_INCLUDE_DIRS)
  target_include_directories(pdfx BEFORE PRIVATE ${PDFX_PoDoFo_INCLUDE_DIRS})
endif()

target_link_libraries(pdfx PUBLIC ${PDFX_PoDoFo_TARGET})

add_executable(pdfx_cli src/cli_main.cpp)
target_link_libraries(pdfx_cli PRIVATE pdfx)

install(TARGETS pdfx pdfx_cli)
install(DIRECTORY include/ DESTINATION include)
