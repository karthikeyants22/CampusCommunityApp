// // AppContext.js
// import React, { createContext, useState, useContext } from "react";

// // 1️⃣ Create Context
// const AppContext = createContext();

// // 2️⃣ Create Provider
// export const AppProvider = ({ children }) => {
//   // Store multiple info values in one state object
//   const [appData, setAppData] = useState({
//     name: "karthikeyan",
//     email: "",
//     phone: "",
//     address: "",
//     age: "",
//     gender: "",
//     occupation: "",
//     country: "",
//     city: "",
   
//     role:"",
//     password:"",
//     confirmpassword:""
//   });

//   // Function to update a single field
//   const updateField = (key, value) => {
//     setAppData(prev => ({ ...prev, [key]: value }));
//   };

//   return (
//     <AppContext.Provider value={{ appData, updateField }}>
//       {children}
//     </AppContext.Provider>
//   );
// };

// // 3️⃣ Custom hook for easier usage
// export const useAppContext = () => useContext(AppContext);

// AppContext.js
import React, { createContext, useState, useContext } from "react";

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [appData, setAppData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    age: "",
    gender: "",
    occupation: "",
    country: "",
    city: "",
    role: "",
    password: "",
    confirmpassword: "",
    otpvalnumber:""
  });

  // ✅ Update one field or multiple fields
  const updateField = (key, value) => {
    if (typeof key === "object") {
      // multiple fields
      setAppData(prev => ({ ...prev, ...key }));
    } else {
      // single field
      setAppData(prev => ({ ...prev, [key]: value }));
    }
  };

  return (
    <AppContext.Provider value={{ appData, updateField }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
