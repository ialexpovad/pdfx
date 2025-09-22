include(FetchContent)

option(PDFX_VENDOR_DEPS "Build third-party deps from source" OFF)
set(PDFX_PODOFO_TAG "1.0.0" CACHE STRING "PoDoFo tag/branch to fetch when vendoring")

# Try system/vcpkg first
if (NOT PDFX_VENDOR_DEPS)
  find_package(PoDoFo CONFIG QUIET)
  if (PoDoFo_FOUND)
    set(_pdfx_candidates PoDoFo::podofo podofo::podofo podofo podofo_shared podofo_static)
    foreach(t IN LISTS _pdfx_candidates)
      if (TARGET ${t})
        set(PDFX_PoDoFo_TARGET ${t})
        # capture interface include dirs (may already contain both src+binary)
        get_target_property(_inc ${PDFX_PoDoFo_TARGET} INTERFACE_INCLUDE_DIRECTORIES)
        if (_inc)
          set(PDFX_PoDoFo_INCLUDE_DIRS "${_inc}")
        endif()
        message(STATUS "[pdfx] Using system PoDoFo target: ${PDFX_PoDoFo_TARGET}")
        return()
      endif()
    endforeach()
  endif()
  message(STATUS "[pdfx] System PoDoFo not found; falling back to vendored build")
endif()
# Vendor from source
FetchContent_Declare(
  podofo_src
  GIT_REPOSITORY https://github.com/podofo/podofo.git
  GIT_TAG        ${PDFX_PODOFO_TAG}
)
FetchContent_MakeAvailable(podofo_src)

# Resolve target
set(_pdfx_candidates PoDoFo::podofo podofo::podofo podofo podofo_shared podofo_static)
foreach(t IN LISTS _pdfx_candidates)
  if (TARGET ${t})
    set(PDFX_PoDoFo_TARGET ${t})
    # Base include dirs
    set(PDFX_PoDoFo_INCLUDE_DIRS
      "${podofo_src_SOURCE_DIR}/src"
      "${podofo_src_SOURCE_DIR}/src/auxiliary"
      "${podofo_src_BINARY_DIR}"
      "${podofo_src_BINARY_DIR}/src"
    )
    # Auto-detect the actual folder of the generated header
    file(GLOB_RECURSE _podofo_cfg
      "${podofo_src_BINARY_DIR}/podofo_config.h"
      "${podofo_src_BINARY_DIR}/*/podofo_config.h"
    )
    if (_podofo_cfg)
      list(GET _podofo_cfg 0 _podofo_cfg_path)
      get_filename_component(_podofo_cfg_dir "${_podofo_cfg_path}" DIRECTORY)
      list(APPEND PDFX_PoDoFo_INCLUDE_DIRS "${_podofo_cfg_dir}")
    endif()
    list(REMOVE_DUPLICATES PDFX_PoDoFo_INCLUDE_DIRS)

    message(STATUS "[pdfx] Using vendored PoDoFo target: ${PDFX_PoDoFo_TARGET}")
    message(STATUS "[pdfx] PoDoFo include dirs: ${PDFX_PoDoFo_INCLUDE_DIRS}")
    return()
  endif()
endforeach()

message(FATAL_ERROR "[pdfx] PoDoFo target not found after vendoring")
