cmake_minimum_required(VERSION 3.4.1)

project(appmodules)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fexceptions -frtti")

# Define React Native directory
set(REACT_ANDROID_DIR ${CMAKE_SOURCE_DIR}/../../../../../node_modules/react-native/ReactAndroid)

add_library(appmodules
    SHARED
    ${REACT_ANDROID_DIR}/cmake-utils/default-app-setup/OnLoad.cpp
)

find_library(log-lib log)

target_include_directories(appmodules PRIVATE
    ${REACT_ANDROID_DIR}/cmake-utils/default-app-setup
    ${REACT_ANDROID_DIR}/src/main/jni
    ${REACT_ANDROID_DIR}/src/main/jni/first-party
    ${REACT_ANDROID_DIR}/src/main/jni/react
    ${REACT_ANDROID_DIR}/src/main/jni/react/newarchdefaults
    ${REACT_ANDROID_DIR}/build/generated/source/codegen/jni
)

target_link_libraries(appmodules
    ${log-lib}
    -ljnigraphics
    -landroid
    c++_shared
)