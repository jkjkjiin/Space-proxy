import { db } from "./firebase.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";
const displayNameEl = document.getElementById("displayName");
const bioEl = document.getElementById("bio");
const uidEl = document.getElementById("uid");
const loadingEl = document.getElementById("loading");
const profileContent = document.getElementById("profileContent");
const errorEl = document.getElementById("error");
const messageBtn = document.getElementById("messageUserBtn");
const urlParams = new URLSearchParams(window.location.search);
let username = decodeURIComponent(urlParams.get("user") || "").trim();
if (username.toLowerCase() === "example410ðŸ’Ž" || username.toLowerCase() === "example410 ðŸ’Ž") {
  username = "example410 ðŸ’Ž";
}
if (!username) {
  showError("No Username Specified In The URL. Example: ?user=example410");
} else {
  loadUserProfile(username);
}
async function loadUserProfile(username) {
  try {
    const usersSnap = await get(ref(db, "users"));
    if (!usersSnap.exists()) {
      showError("No Users Found.");
      return;
    }
    let foundUser = null;
    usersSnap.forEach((child) => {
      const data = child.val();
      const displayName = data?.profile?.displayName;
      if (displayName && displayName.toLowerCase() === username.toLowerCase()) {
        foundUser = { uid: child.key, ...data };
      }
    });
    if (!foundUser) {
      showError(`User "${username}" Not Found.`);
      return;
    }
    const color = foundUser.settings?.color || "#ffffff";
    const bio = foundUser.profile?.bio || "No Bio Set.";
    const displayName = foundUser.profile?.displayName || "(No Name)";
    const picValue = foundUser.profile?.pic ?? 0;
    const profileImages = [
      "/pfps/1.jpeg",
      "/pfps/2.jpeg",
      "/pfps/3.jpeg",
      "/pfps/4.jpeg",
      "/pfps/5.jpeg",
      "/pfps/6.jpeg",
      "/pfps/7.jpeg",
      "/pfps/8.jpeg",
      "/pfps/9.jpeg",
      "/pfps/f3.jpeg",
      "/pfps/kaiden.png"
    ];
    const imgSrc = profileImages[picValue] || profileImages[0];
    loadingEl.style.display = "none";
    errorEl.style.display = "none";
    profileContent.style.display = "block";
    displayNameEl.innerHTML = "";
    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.alignItems = "center";
    container.style.gap = "10px";
    const img = document.createElement("img");
    img.src = imgSrc;
    img.alt = "Profile Icon";
    img.style.width = "60px";
    img.style.height = "60px";
    img.style.marginLeft = "20px";
    img.style.borderRadius = "50%";
    img.style.border = "2px solid white";
    img.style.objectFit = "cover";
    const nameSpan = document.createElement("span");
    nameSpan.textContent = `@${displayName}`;
    nameSpan.style.color = color;
    nameSpan.style.fontSize = "1.2em";
    nameSpan.style.fontWeight = "600";
    container.appendChild(img);
    container.appendChild(nameSpan);
    displayNameEl.appendChild(container);
    bioEl.textContent = bio;
    uidEl.textContent = `User ID: ${foundUser.uid}`;
    if (messageBtn) {
      messageBtn.style.display = "inline-block";
      messageBtn.onclick = () => {
        localStorage.setItem("openPrivateChatUid", foundUser.uid);
        window.location.href = "chat.html";
      };
    }
  } catch (err) {
    showError("Error Loading Profile: " + err.message);
  }
}
function showError(msg) {
  loadingEl.style.display = "none";
  profileContent.style.display = "none";
  errorEl.style.display = "block";
  errorEl.textContent = msg;
}
