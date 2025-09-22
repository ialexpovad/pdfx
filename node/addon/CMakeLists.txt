cmake_minimum_required(VERSION 3.21)
project(pdfx_addon LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# Pull in the C++ core (builds static lib target "pdfx")
get_filename_component(PDFX_ROOT "${CMAKE_CURRENT_LIST_DIR}/../.." ABSOLUTE)
add_subdirectory("${PDFX_ROOT}/cpp" "${CMAKE_BINARY_DIR}/pdfx_core")

# Resolve Node headers provided by cmake-js
# (CMAKE_JS_INC / CMAKE_JS_LIB are defined by cmake-js during configure)
if (NOT CMAKE_JS_INC)
  message(FATAL_ERROR "CMAKE_JS_INC not set; run via 'cmake-js build'")
endif()

# Resolve node-addon-api directory robustly
execute_process(
  COMMAND node -p "require('path').dirname(require.resolve('node-addon-api/package.json'))"
  WORKING_DIRECTORY ${CMAKE_CURRENT_LIST_DIR}
  OUTPUT_VARIABLE NODE_ADDON_API_DIR
  OUTPUT_STRIP_TRAILING_WHITESPACE
)
if (NOT EXISTS "${NODE_ADDON_API_DIR}/napi.h")
  message(FATAL_ERROR "node-addon-api not found at: ${NODE_ADDON_API_DIR}. Run 'npm i' in node/addon.")
endif()
message(STATUS "node-addon-api dir: ${NODE_ADDON_API_DIR}")

add_library(pdfx_node MODULE binding.cpp)

target_include_directories(pdfx_node PRIVATE
  "${PDFX_ROOT}/cpp/include"
  ${CMAKE_JS_INC}
  "${NODE_ADDON_API_DIR}"
)

target_link_libraries(pdfx_node PRIVATE ${CMAKE_JS_LIB} pdfx)

if(APPLE)
  target_link_options(pdfx_node PRIVATE "-undefined" "dynamic_lookup")
endif()

set_target_properties(pdfx_node PROPERTIES
  PREFIX ""
  SUFFIX ".node"
  OUTPUT_NAME "pdfx"
)