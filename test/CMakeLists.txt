cmake_minimum_required(VERSION 3.14)
project(pawse_tests CXX)

set(CMAKE_CXX_STANDARD 14)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)

include(FetchContent)
FetchContent_Declare(
  googletest
  URL https://github.com/google/googletest/archive/refs/tags/v1.15.2.zip
)
FetchContent_MakeAvailable(googletest)

enable_testing()

add_executable(pawse_tests
  test_session_core.cpp
  ../hardware_prototype_ble/session_core.cpp
)

target_include_directories(pawse_tests PRIVATE
  ../hardware_prototype_ble
  .
)

if(MSVC)
  target_compile_options(pawse_tests PRIVATE /W4)
  target_compile_definitions(pawse_tests PRIVATE _CRT_SECURE_NO_WARNINGS)
else()
  target_compile_options(pawse_tests PRIVATE -Wall -Wextra)
endif()

target_link_libraries(pawse_tests GTest::gtest_main)

include(GoogleTest)
gtest_discover_tests(pawse_tests)