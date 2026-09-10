// frontend/src/utils/logout.js
export const logout = () => {
  console.log("🚪 Logging out...");
  
  // Clear all localStorage items
  const keysToRemove = [
    "user",
    "isLoggedIn", 
    "accessToken",
    "token",
    "refreshToken"
  ];
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });
  
  // Clear sessionStorage
  sessionStorage.clear();
  
  // Clear cookies if any
  document.cookie.split(";").forEach(c => {
    document.cookie = c
      .replace(/^ +/, "")
      .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
  });
  
  console.log("✅ Logged out successfully");
  
  // Redirect to login with full page reload
  window.location.href = "/login";
};

export default logout;