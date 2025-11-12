import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import {
    ref, push, onChildAdded, onChildRemoved, onChildChanged,
    remove, update, set, get, runTransaction, onValue, off
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";
const channelList = document.getElementById("channels");
const chatLog = document.getElementById("chatLog");
const mentionNotif = document.getElementById("mentionNotif");
const mentionToggle = document.getElementById("mentionToggle");
const mentionToggleLabel = document.getElementById("mentionToggleLabel");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const adminControls = document.getElementById("adminControls");
const newChannelName = document.getElementById("newChannelName");
const addChannelBtn = document.getElementById("addChannelBtn");
const privateList = document.getElementById("privateList");
const usernameSpan = document.getElementById("username");
const emailSpan = document.getElementById("email");
const roleSpan = document.getElementById("role");
let currentPath = null;
let currentMsgRef = null;
let currentListeners = {};
let currentUser = null;
let currentName = "User";
let currentColor = "#ffffff";
let isAdmin = false;
let isOwner = false;
let currentPrivateUid = null;
let currentPrivateName = null;
let metadataListenerRef = null;
let autoScrollEnabled = true;
const privateListeners = new Set();
const channelMentionSet = new Set();
const style = document.createElement("style");
style.textContent = `
.mention {
  color: #4fa3ff;
  font-weight: bold;
  background: rgba(79,163,255,0.1);
  padding: 2px 4px;
  border-radius: 4px;
}
.mention-self {
  color: gold;
  font-weight: bold;
  background: rgba(255,215,0,0.15);
  padding: 2px 4px;
  border-radius: 4px;
}
.notifDot {
  color: red;
  font-weight: bold;
  margin-right: 6px;
}
.msg { margin: 6px 0; }
.left { display:flex; align-items:center; gap:6px; }
`;
const typingIndicator = document.createElement("div");
typingIndicator.id = "typingIndicator";
typingIndicator.style.fontSize = "0.8em";
typingIndicator.style.color = "#aaa";
typingIndicator.style.marginTop = "4px";
typingIndicator.style.display = "none";
chatInput.insertAdjacentElement("beforebegin", typingIndicator);
let typingTimeout = null;
let typingRef = null;
document.head.appendChild(style);
let currentErrorDiv = null;
function showError(message) {
    if (currentErrorDiv) currentErrorDiv.remove();
    const errorDiv = document.createElement("div");
    errorDiv.textContent = message;
    Object.assign(errorDiv.style, {
        position: "fixed",
        top: header ? `${header.offsetHeight + 10}px` : "10px",
        left: "50%",
        transform: "translateX(-50%)",
        backgroundColor: "salmon",
        color: "black",
        border: "2px solid red",
        borderRadius: "8px",
        padding: "10px 20px",
        zIndex: 9999,
        cursor: "pointer",
        maxWidth: "90%",
        textAlign: "center",
        fontWeight: "bold",
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
    });
    errorDiv.addEventListener("click", () => {
        errorDiv.remove();
        currentErrorDiv = null;
    });
    document.body.appendChild(errorDiv);
    currentErrorDiv = errorDiv;
}
chatLog.addEventListener("scroll", () => {
    const nearBottom = chatLog.scrollHeight - chatLog.scrollTop - chatLog.clientHeight < 50;
    autoScrollEnabled = nearBottom;
});
function scrollToBottom(smooth = false) {
    requestAnimationFrame(() => {
        chatLog.scrollTop = chatLog.scrollHeight;
        setTimeout(() => {
            chatLog.scrollTop = chatLog.scrollHeight;
            if (smooth) {
                chatLog.scrollTo({ top: chatLog.scrollHeight, behavior: "smooth" });
            }
        }, 50);
    });
}
const clock = document.createElement("div");
clock.id = "clock";
clock.style.textAlign = "center";
clock.style.marginTop = "-1%";
const roleEl = document.getElementById("role");
const header = document.getElementById("header");
if (header && roleEl) {
    header.style.position = "relative";
    const roleRect = roleEl.getBoundingClientRect();
    const headerRect = header.getBoundingClientRect();
    const offsetTop = roleEl.offsetTop + roleEl.offsetHeight + 5;
    header.appendChild(clock);
}
function updateClock() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;
    const displayMinute = minutes.toString().padStart(2, '0');
    const displaySecond = seconds.toString().padStart(2, '0');
    clock.textContent = `${displayHour}:${displayMinute}:${displaySecond} ${ampm}`;
}
updateClock();
setInterval(updateClock, 100);
async function muteUser(uid) {
    const muteRef = ref(db, `mutedUsers/${uid}`);
    const expireTime = Date.now() + 24 * 60 * 60 * 1000;
    await set(muteRef, { expires: expireTime });
    showSuccess("User Muted For 1 Day.");
}
async function unmuteUser(uid) {
    await remove(ref(db, `mutedUsers/${uid}`));
    showSuccess("User Unmuted.");
}
async function isUserMuted(uid) {
    const muteRef = ref(db, `mutedUsers/${uid}`);
    const snap = await get(muteRef);
    if (!snap.exists()) return false;
    const data = snap.val();
    if (data.expires && Date.now() > data.expires) {
        await remove(muteRef); 
        return false;
    }
    return true;
}
function detachCurrentMessageListeners() {
    if (!currentMsgRef) return;
    try {
        if (currentListeners.added) off(currentMsgRef, 'child_added', currentListeners.added);
        if (currentListeners.removed) off(currentMsgRef, 'child_removed', currentListeners.removed);
        if (currentListeners.changed) off(currentMsgRef, 'child_changed', currentListeners.changed);
    } catch (e) {}
    currentMsgRef = null;
    currentListeners = {};
}
async function ensureDisplayName(user) {
    const nameSnap = await get(ref(db, `users/${user.uid}/profile/displayName`));
    if (!nameSnap.exists()) {
        const name = (user.email === "example@gmail.org") ? "hacker41 ðŸ’Ž" : "User";
        await set(ref(db, `users/${user.uid}/profile/displayName`), name);
        currentName = name;
        localStorage.setItem("displayName", name);
    } else {
        currentName = nameSnap.val();
        localStorage.setItem("displayName", currentName);
    }
    const colorSnap = await get(ref(db, `users/${user.uid}/settings/color`));
    if (colorSnap.exists()) {
        currentColor = colorSnap.val();
        localStorage.setItem("color", currentColor);
    } else {
        currentColor = "#ffffff";
    }
}
mentionToggle.addEventListener("change", async () => {
    if (!currentUser) return;
    const newValue = mentionToggle.checked;
    try {
        await set(ref(db, `users/${currentUser.uid}/settings/showMentions`), newValue);
        mentionToggleLabel.style.color = newValue ? "gold" : "#888";
    } catch (err) {
        showError("Failed To Save Mention Setting:", err);
    }
});
async function loadMentionSetting(user) {
    try {
        const settingRef = ref(db, `users/${user.uid}/settings/showMentions`);
        const snap = await get(settingRef);
        if (snap.exists()) {
            mentionToggle.checked = snap.val();
        } else {
            mentionToggle.checked = true;
            await set(settingRef, true);
        }
        mentionToggleLabel.style.color = mentionToggle.checked ? "gold" : "#888";
    } catch (err) {
        showError("Failed To Load Mention Setting:", err);
        mentionToggle.checked = true;
    }
}
async function getDisplayName(uid) {
    const snap = await get(ref(db, `users/${uid}/profile/displayName`));
    return snap.exists() ? snap.val() : "User";
}
mentionNotif.addEventListener("click", () => {
    const msgId = mentionNotif.dataset.msgid;
    if (msgId) {
        const seenRef = ref(db, `metadata/${currentUser.uid}/mentions/${msgId}/seen`);
        set(seenRef, true);
    }
    mentionNotif.style.display = "none";
});
function messageMentionsYou(text) {
    if (!text || !currentName) return false;
    const lowerMsg = text.toLowerCase();
    const plain = currentName.toLowerCase().replace(" ðŸ’Ž", "");
    return lowerMsg.includes(`@${plain}`) || lowerMsg.includes(`@${plain} ðŸ’Ž`);
}
async function processChannelMentions(htmlText) {
    const channelRegex = /#([A-Za-z0-9_\-]+)/g;
    const channelSnap = await get(ref(db, "channels"));
    const allChannels = channelSnap.exists() ? Object.keys(channelSnap.val()) : [];
    return htmlText.replace(channelRegex, (match, chName) => {
        if (allChannels.includes(chName)) {
            return `<span class="channel-mention" data-channel="${chName}">#${chName}</span>`;
        } else {
            return `#${chName}`;
        }
    });
}
function clearChannelMention(channelName) {
    channelMentionSet.delete(channelName);
    const lis = channelList.querySelectorAll("li");
    lis.forEach(li => {
        if (li.textContent && li.textContent.trim().startsWith(channelName)) {
            const dot = li.querySelector(".mentionDot");
            if (dot) dot.remove();
        }
    });
}
function formatTimestamp(ts) {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(); yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    const timeString = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
    if (isToday) return timeString;
    else if (isYesterday) return `Yesterday At ${timeString}`;
    else return `${d.toLocaleDateString()} ${timeString}`;
}
function isRestrictedChannel(ch) {
    return ch === "Admin-Chat";
}
async function renderMessageInstant(id, msg) {
    if (document.getElementById("msg-" + id)) return null;
    const div = document.createElement("div");
    div.className = "msg";
    div.id = "msg-" + id;
    div.dataset.timestamp = msg.timestamp || Date.now();
    const topRow = document.createElement("div");
    topRow.style.display = "flex";
    topRow.style.justifyContent = "space-between";
    topRow.style.marginBottom = "2px";
    const nameSpan = document.createElement("span");
    nameSpan.textContent = "User";
    nameSpan.className = "highlight";
    nameSpan.style.color = "#aaa";
    nameSpan.style.cursor = "pointer";
    const leftWrapper = document.createElement("span");
    leftWrapper.style.display = "flex";
    leftWrapper.style.gap = "6px";
    const profilePic = document.createElement("img");
    profilePic.style.width = "32px";
    profilePic.style.height = "32px";
    profilePic.style.borderRadius = "50%";
    profilePic.style.border = "2px solid white";
    profilePic.style.objectFit = "cover";
    profilePic.style.cursor = "pointer";
    const profilePics = [
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
    leftWrapper.appendChild(profilePic);
    leftWrapper.appendChild(nameSpan);
    const timeSpan = document.createElement("span");
    timeSpan.className = "timestamp";
    timeSpan.textContent = msg.timestamp ? formatTimestamp(msg.timestamp) : "";
    topRow.appendChild(leftWrapper);
    topRow.appendChild(timeSpan);
    const textDiv = document.createElement("div");
    textDiv.style.whiteSpace = "pre-wrap";
    textDiv.style.marginLeft = "40px";
    textDiv.style.marginTop = "-15px";
    let safeText = (msg.text || "")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
    const mentionRegex = /@([^\s<]+)/g;
    safeText = safeText.replace(mentionRegex, (match, name) => {
        const isSelfMention = currentName && (currentName.toLowerCase() === name.toLowerCase() ||
            currentName.toLowerCase() === name.toLowerCase().replace(" ðŸ’Ž", ""));
        const cls = isSelfMention ? "mention-self" : "mention";
        return `<span class="${cls}">@${name}</span>`;
    });
    const urlRegex = /\b((?:https?:\/\/)?(?:[\w-]+\.)+[a-z]{2,}(?:\/[^\s]*)?)/gi;
    safeText = safeText.replace(urlRegex, (match) => {
        let display = match;
        while (/[.,!?;:)\]\"]$/.test(display)) display = display.slice(0, -1);
        let href = display.trim();
        if (!/^https?:\/\//i.test(href)) href = "https://" + href;
        const trailing = match.slice(display.length);
        return `<a href="${href}" target="_blank" rel="noopener noreferrer"
            style="color:#4fa3ff; text-decoration:underline; position:relative;">${display}</a>${trailing}`;
    });
    safeText = await processChannelMentions(safeText);
    textDiv.innerHTML = safeText;
    textDiv.querySelectorAll(".channel-mention").forEach(span => {
        span.style.color = "#4fa3ff";
        span.style.cursor = "pointer";
        span.addEventListener("click", () => {
            const ch = span.dataset.channel;
            if (typeof switchChannel === "function") {
                switchChannel(ch);
            } else {
                console.warn("switchChannel() not defined, cannot change channel:", ch);
            }
        });
    });
    let previewDiv = document.querySelector(".link-preview-global");
    if (!previewDiv) {
        previewDiv = document.createElement("div");
        previewDiv.className = "link-preview-global";
        Object.assign(previewDiv.style, {
            position: "absolute",
            zIndex: "9999",
            display: "none",
            width: "320px",
            background: "rgba(20,20,20,0.95)",
            padding: "10px",
            borderRadius: "10px",
            border: "1px solid #333",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            color: "#fff",
            transition: "opacity 0.15s ease",
            opacity: "0",
            pointerEvents: "none"
        });
        document.body.appendChild(previewDiv);
    }
    const links = textDiv.querySelectorAll("a[href]");
    const cache = {};
    links.forEach((link) => {
        const url = link.href;
        link.addEventListener("mouseenter", async (e) => {
            const rect = link.getBoundingClientRect();
            previewDiv.style.top = `${rect.bottom + 6}px`;
            previewDiv.style.left = `${Math.min(rect.left, window.innerWidth - 340)}px`;
            previewDiv.style.display = "block";
            previewDiv.style.opacity = "1";
            previewDiv.innerHTML = "Loading Preview...";
            if (!cache[url]) {
                try {
                    const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
                    const data = await res.json();
                    if (data.status === "success" && data.data) {
                        const { title, description, image } = data.data;
                        cache[url] = { title, description, image };
                    } else {
                        cache[url] = { error: "(No Preview Available)" };
                    }
                } catch {
                    cache[url] = { error: "(Preview Failed)" };
                }
            }
            const info = cache[url];
            if (info.error) {
                previewDiv.textContent = info.error;
            } else {
                previewDiv.innerHTML = "";
                const content = document.createElement("div");
                content.style.display = "flex";
                content.style.alignItems = "center";
                content.style.gap = "8px";
                if (info.image?.url) {
                    const img = document.createElement("img");
                    img.src = info.image.url;
                    img.style.width = "60px";
                    img.style.height = "60px";
                    img.style.border = "1px solid white";
                    img.style.objectFit = "cover";
                    img.style.borderRadius = "6px";
                    content.appendChild(img);
                }
                const details = document.createElement("div");
                details.style.flex = "1";
                if (info.title) {
                    const titleEl = document.createElement("div");
                    titleEl.textContent = info.title;
                    titleEl.style.fontWeight = "bold";
                    details.appendChild(titleEl);
                }
                if (info.description) {
                    const descEl = document.createElement("div");
                    descEl.textContent = info.description;
                    descEl.style.fontSize = "0.8em";
                    descEl.style.color = "#ccc";
                    descEl.style.lineHeight = "1.2em";
                    details.appendChild(descEl);
                }
                content.appendChild(details);
                previewDiv.appendChild(content);
            }
        });
        link.addEventListener("mouseleave", () => {
            previewDiv.style.opacity = "0";
            setTimeout(() => {
                previewDiv.style.display = "none";
            }, 150);
        });
    });
    const editedSpan = document.createElement("div");
    editedSpan.className = "edited-label";
    editedSpan.style.fontSize = "0.7em";
    editedSpan.style.color = "#aaa";
    editedSpan.style.marginTop = "2px";
    editedSpan.style.marginLeft = "35px";
    editedSpan.textContent = msg.edited ? "(Edited)" : "";
    div.appendChild(topRow);
    div.appendChild(textDiv);
    div.appendChild(editedSpan);
    (async () => {
        try {
            const [nameSnap, colorSnap, picSnap, badgeSnap, adminSnap, ownerSnap] = await Promise.all([
                get(ref(db, `users/${msg.sender}/profile/displayName`)),
                get(ref(db, `users/${msg.sender}/settings/color`)),
                get(ref(db, `users/${msg.sender}/profile/pic`)),
                get(ref(db, `users/${msg.sender}/settings/badgeText`)),
                get(ref(db, `users/${msg.sender}/profile/isAdmin`)),
                get(ref(db, `users/${msg.sender}/profile/isOwner`))
            ]);
            const displayName = nameSnap.exists() ? nameSnap.val() : "User";
            const color = colorSnap.exists() ? colorSnap.val() : "#4fa3ff";
            const badgeText = badgeSnap.exists() ? badgeSnap.val() : null;
            const picVal = picSnap.exists() ? picSnap.val() : 0;
            const picIndex = (picVal >= 0 && picVal <= 10) ? picVal : 0;
            profilePic.src = profilePics[picIndex];
            const senderIsAdmin = adminSnap.exists() ? adminSnap.val() : false;
            const senderIsOwner = ownerSnap.exists() ? ownerSnap.val() : false;
            nameSpan.textContent = displayName;
            nameSpan.style.color = color;
            const openProfile = () => {
                const cleanName = encodeURIComponent(displayName.replace(/ /g, ""));
                window.location.href = `profile.html?user=${cleanName}`;
            };
            nameSpan.onclick = openProfile;
            profilePic.onclick = openProfile;
            nameSpan.textContent = displayName;
            nameSpan.style.color = color;
            if (isOwner && !senderIsOwner) {
                nameSpan.addEventListener("contextmenu", async (e) => {
                    e.preventDefault();
                    const alreadyMuted = await isUserMuted(msg.sender);
                    const menu = document.createElement("div");
                    menu.style.position = "absolute";
                    menu.style.left = e.pageX + "px";
                    menu.style.top = e.pageY + "px";
                    menu.style.background = "#222";
                    menu.style.border = "1px solid #555";
                    menu.style.borderRadius = "6px";
                    menu.style.padding = "6px 10px";
                    menu.style.color = "#fff";
                    menu.style.cursor = "pointer";
                    menu.style.zIndex = 9999;
                    menu.textContent = alreadyMuted ? "Unmute User" : "Mute For 1 Day";
                    document.body.appendChild(menu);
                    const closeMenu = () => { menu.remove(); document.removeEventListener("click", closeMenu); };
                    document.addEventListener("click", closeMenu);
                    menu.addEventListener("click", async () => {
                        if (alreadyMuted) await unmuteUser(msg.sender);
                        else await muteUser(msg.sender);
                        closeMenu();
                    });
                });
            }
            if (badgeText) {
                const badgeSpan = document.createElement("span");
                badgeSpan.textContent = `| ${badgeText} |`;
                badgeSpan.style.marginLeft = "6px";
                badgeSpan.style.fontWeight = "bold";
                if (badgeText === "Co-Owner") badgeSpan.style.color = "lightblue";
                else if (badgeText === "Tester") badgeSpan.style.color = "darkgoldenrod";
                else if (senderIsAdmin) badgeSpan.style.color = "blue";
                else badgeSpan.style.color = "lime";
                leftWrapper.appendChild(badgeSpan);
            }
            const isSelf = msg.sender === currentUser.uid;
            if (isSelf || isOwner || isAdmin) {
                let canDelete = false;
                if (isSelf || isOwner) canDelete = true;
                else if (isAdmin && !senderIsAdmin && !senderIsOwner) canDelete = true;
                if (canDelete) {
                    const delBtn = document.createElement("button");
                    delBtn.textContent = "Delete";
                    delBtn.onclick = () => remove(ref(db, currentPath + "/" + id));
                    div.appendChild(delBtn);
                }
                if (isSelf || isOwner) {
                    const editBtn = document.createElement("button");
                    editBtn.textContent = "Edit";
                    editBtn.onclick = () => {
                        if (div.querySelector("textarea")) return;
                        const textarea = document.createElement("textarea");
                        textarea.value = msg.text;
                        textarea.style.width = "100%";
                        textarea.style.boxSizing = "border-box";
                        textarea.style.resize = "vertical";
                        textarea.style.background = "#121212";
                        textarea.style.overflowY = "auto";
                        textarea.style.color = "white";
                        textarea.style.minHeight = "40px";
                        textarea.style.maxHeight = "400px";
                        textarea.style.height = "auto";
                        textDiv.style.display = "none";
                        div.insertBefore(textarea, textDiv.nextSibling);
                        textarea.focus();
                        requestAnimationFrame(() => {
                            textarea.style.height = "auto";
                            textarea.style.height = textarea.scrollHeight + "px";
                        });
                        textarea.addEventListener("input", () => {
                            textarea.style.height = "auto";
                            textarea.style.height = textarea.scrollHeight + "px";
                        });
                        textarea.addEventListener("keydown", async (e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                const newText = textarea.value.trim();
                                if (newText.length > 10000) {
                                    showError(`Your Edited Message Is Too Long (${newText.length} Characters). Please Keep It Under 10000.`);
                                    textarea.value = "";
                                    return;
                                }
                                if (newText !== "") {
                                    await update(ref(db, currentPath + "/" + id), {
                                        text: newText,
                                        edited: true
                                    });
                                }
                                textarea.remove();
                                textDiv.style.display = "block";
                            } else if (e.key === "Escape") {
                                e.preventDefault();
                                textarea.remove();
                                textDiv.style.display = "block";
                            }
                        });
                    };
                    div.appendChild(editBtn);
                }
            }
        } catch (err) {
            showError("Metadata Fetch Failed:", err);
        }
    })();
    try {
        const mentionedYou = messageMentionsYou(msg.text);
        if (mentionedYou && msg.sender !== currentUser.uid && mentionToggle.checked) {
            const mentionRef = ref(db, `metadata/${currentUser.uid}/mentions/${id}`);
            get(mentionRef).then((snapshot) => {
                const data = snapshot.val();
                if (!data || data.seen === false) {
                    if (currentPath && currentPath.startsWith("messages/")) {
                        const channelName = currentPath.split("/")[1];
                    }
                    mentionNotif.style.display = "inline";
                    mentionNotif.dataset.msgid = id;
                    if (!data) {
                        set(mentionRef, {
                            seen: false,
                            channel: currentPath?.split("/")[1] || null,
                        });
                    }
                    (async () => {
                        const nm = await getDisplayName(msg.sender);
                        mentionNotif.textContent = `You Were Mentioned By ${nm}!`;
                        mentionNotif.animate(
                            [{ opacity: 0 }, { opacity: 1 }, { opacity: 0.5 }, { opacity: 1 }],
                            { duration: 1000 }
                        );
                        playNotificationSound()
                    })();
                }
            });
        }
    } catch (e) {
        showError(e);
    }
    return div;
}
async function attachMessageListeners(msgRef) {
    detachCurrentMessageListeners();
    currentMsgRef = msgRef;
    chatLog.innerHTML = "";
    const snapshot = await get(msgRef);
    const msgs = snapshot.exists() ? snapshot.val() : {};
    const entries = Object.entries(msgs).sort((a, b) => a[1].timestamp - b[1].timestamp);
    const renderPromises = entries.map(([id, msg]) => renderMessageInstant(id, msg));
    const createdDivs = await Promise.all(renderPromises);
    createdDivs.forEach(d => { if (d) chatLog.appendChild(d); });
    scrollToBottom(true);
    currentListeners.added = onChildAdded(msgRef, async snap => {
        if (msgRef !== currentMsgRef) return;
        const key = snap.key;
        const val = snap.val();
        if (!document.getElementById("msg-" + key)) {
            const newDiv = await renderMessageInstant(key, val);
            if (!newDiv) return;
            const newTs = Number(val.timestamp || Date.now());
            const msgsEls = Array.from(chatLog.querySelectorAll(".msg"));
            let inserted = false;
            for (const el of msgsEls) {
                const elTs = Number(el.dataset.timestamp || 0);
                if (elTs > newTs) {
                    chatLog.insertBefore(newDiv, el);
                    inserted = true;
                    break;
                }
            }
            if (!inserted) chatLog.appendChild(newDiv);
            const mentionsYou = messageMentionsYou(val.text);
            if (!mentionsYou && autoScrollEnabled) {
                scrollToBottom(true);
            } else {
            }
        }
    });
    currentListeners.removed = onChildRemoved(msgRef, snap => {
        if (msgRef !== currentMsgRef) return;
        const el = document.getElementById("msg-" + snap.key);
        if (el) el.remove();
    });
    currentListeners.changed = onChildChanged(msgRef, snap => {
        if (msgRef !== currentMsgRef) return;
        const el = document.getElementById("msg-" + snap.key);
        if (el) {
            const textDiv = el.querySelector("div:nth-child(2)");
            const editedSpan = el.querySelector(".edited-label");
            let safeText = (snap.val().text || "")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/\n/g, "<br>");
            const mentionRegex = /@([^\s<]+)/g;
            safeText = safeText.replace(mentionRegex, (_match, name) => {
                const isSelfMention = currentName && (currentName.toLowerCase() === name.toLowerCase() ||
                    currentName.toLowerCase() === name.toLowerCase().replace(" ðŸ’Ž", ""));
                const cls = isSelfMention ? "mention-self" : "mention";
                return `<span class="${cls}">@${name}</span>`;
            });
            textDiv.innerHTML = safeText;
            editedSpan.textContent = snap.val().edited ? "(Edited)" : "";
        }
    });
}
function playNotificationSound() {
    const audio = new Audio("https://codehs.com/uploads/47d60c5093ca59dfa2078b03c0264f64");
    audio.play().catch(err => {
        console.warn("Autoplay Prevented:", err);
    });
}
function attachPrivateMessageListener(uid) {
    if (privateListeners.has(uid)) return;
    privateListeners.add(uid);
    const [a, b] = [currentUser.uid, uid].sort();
    const path = `private/${a}/${b}`;
    const msgRef = ref(db, path);
    onChildAdded(msgRef, snap => {
        const msg = snap.val();
        if (msg && msg.sender !== currentUser.uid) {
            playNotificationSound();
        }
    });
}
async function sendPrivateMessage(otherUid, text) {
    if (!currentUser || !otherUid) return;
    if (otherUid === currentUser.uid) {
        showError("You Cannot Send Private Messages To Yourself!");
        return;
    }
    const [a, b] = [currentUser.uid, otherUid].sort();
    const path = `private/${a}/${b}`;
    const emailRef = ref(db, `users/${currentUser.uid}/settings/userEmail`);
    const emailSnap = await get(emailRef);
    if (!emailSnap.exists()) {
        await set(emailRef, currentUser.email);
    }
    const msg = {
        sender: currentUser.uid,
        text,
        timestamp: Date.now()
    };
    await set(push(ref(db, path)), msg);
    await update(ref(db, `metadata/${currentUser.uid}/privateChats/${otherUid}`), {
        lastRead: Date.now(),
        unreadCount: 0
    });
    const recipientMetaRef = ref(db, `metadata/${otherUid}/privateChats/${currentUser.uid}`);
    await runTransaction(recipientMetaRef, curr => {
        if (curr === null) return { lastRead: 0, unreadCount: 1 };
        return { ...curr, unreadCount: (curr.unreadCount || 0) + 1 };
    });
}
async function openPrivateChat(uid, name) {
    if (!currentUser || !uid) return;
    if (uid === currentUser.uid) {
        showError("You Cannot Open A Private Chat With Yourself!");
        return;
    }
    currentPrivateUid = uid;
    currentPrivateName = name || null;
    chatLog.innerHTML = "";
    const [a, b] = [currentUser.uid, uid].sort();
    currentPath = `private/${a}/${b}`;
    attachMessageListeners(ref(db, currentPath));
    await update(ref(db, `metadata/${currentUser.uid}/privateChats/${uid}`), {
        lastRead: Date.now(),
        unreadCount: 0
    });
}
async function updatePrivateListFromSnapshot(chatsSnapshot) {
    privateList.innerHTML = "";
    if (!chatsSnapshot) return;
    const chats = chatsSnapshot;
    for (const otherUid of Object.keys(chats)) {
        const meta = chats[otherUid] || {};
        const name = await getDisplayName(otherUid);
        const li = document.createElement("li");
        li.dataset.uid = otherUid;
        const left = document.createElement("div");
        left.className = "left";
        const unreadCount = Number(meta.unreadCount || 0);
        if (unreadCount > 0 && currentPrivateUid !== otherUid) {
            const dot = document.createElement("span");
            dot.className = "notifDot";
            dot.textContent = "â€¢";
            left.appendChild(dot);
        }
        const usernameSpan = document.createElement("span");
        usernameSpan.textContent = "" + name;
        left.appendChild(usernameSpan);
        li.appendChild(left);
        const closeBtn = document.createElement("button");
        closeBtn.className = "closeBtn";
        closeBtn.textContent = "X";
        closeBtn.onclick = async (e) => {
            e.stopPropagation();
            if (!confirm("Close This Private Chat? Messages Will Still Be Saved")) return;
            await remove(ref(db, `metadata/${currentUser.uid}/privateChats/${otherUid}`));
        };
        li.appendChild(closeBtn);
        li.onclick = () => openPrivateChat(otherUid, name);
        if (currentPrivateUid === otherUid) li.classList.add("active");
        privateList.appendChild(li);
        attachPrivateMessageListener(otherUid);
    }
}
function startChannelListeners() {
    const channelsRef = ref(db, "channels");
    onChildAdded(channelsRef, snap => { renderChannelsFromDB(); });
    onChildRemoved(channelsRef, snap => {
        if (currentPath && currentPath.startsWith("messages/") && currentPath.endsWith("/" + snap.key) ) {
            switchChannel("General");
            scrollToBottom();
        }
        renderChannelsFromDB();
    });
    onChildChanged(channelsRef, snap => { renderChannelsFromDB(); });
}
async function renderChannelsFromDB() {
    channelList.innerHTML = "";
    const snap = await get(ref(db, "channels"));
    const chans = snap.exists() ? snap.val() : {};
    if (!("General" in chans)) {
        await set(ref(db, "channels/General"), true);
        chans.General = true;
    }
    const keys = Object.keys(chans).sort();
    keys.forEach(ch => {
        if (isRestrictedChannel(ch) && !(isAdmin || isOwner)) return;
        const li = document.createElement("li");
        const textNode = document.createTextNode("" + ch);
        li.appendChild(textNode);
        li.onclick = () => { currentPrivateUid = null; switchChannel(ch); };
        if (!currentPrivateUid && currentPath === `messages/${ch}`) li.classList.add("active");
        if ((isOwner || currentUser.email === "example@gmail.org") && ch !== "General") {
            const btnWrap = document.createElement("span");
            btnWrap.style.marginLeft = "10px";
            const renameBtn = document.createElement("button");
            renameBtn.textContent = "âœŽ";
            renameBtn.onclick = async (e) => {
                e.stopPropagation();
                const newName = prompt("Rename Channel:", ch);
                if (newName && newName.trim() && newName !== ch) {
                    try {
                        const channelSnap = await get(ref(db, `channels/${ch}`));
                        if (channelSnap.exists()) {
                            await set(ref(db, `channels/${newName}`), channelSnap.val());
                        }
                        const msgSnap = await get(ref(db, `messages/${ch}`));
                        if (msgSnap.exists()) {
                            await set(ref(db, `messages/${newName}`), msgSnap.val());
                        }
                        await remove(ref(db, `channels/${ch}`));
                        await remove(ref(db, `messages/${ch}`));
                        showError(`Channel Renamed From ${ch} To ${newName}`);
                    } catch (err) {
                        showError("Error Renaming Channel:", err);
                    }
                }
            };
            const delBtn = document.createElement("button");
            delBtn.textContent = "ðŸ—‘";
            delBtn.onclick = async (e) => {
                e.stopPropagation();
                if (confirm(`Delete Channel ${ch}? This Will Remove All Messages.`)) {
                    await remove(ref(db, `channels/${ch}`));
                    await remove(ref(db, `messages/${ch}`));
                }
            };
            btnWrap.appendChild(renameBtn);
            btnWrap.appendChild(delBtn);
            li.appendChild(btnWrap);
        }
        channelList.appendChild(li);
    });
    if (isOwner || currentUser.email === "example@gmail.org") {
        newChannelName.style.display = "inline-block";
        addChannelBtn.style.display = "inline-block";
    } else {
        newChannelName.style.display = "none";
        addChannelBtn.style.display = "none";
    }
}
function switchChannel(ch) {
    if (isRestrictedChannel(ch) && !(isAdmin || isOwner)) {
        showError("You Don't Have Permission To Access That Channel.");
        ch = "General";
    }
    currentPrivateUid = null;
    currentPrivateName = null;
    chatLog.innerHTML = "";
    currentPath = `messages/${ch}`;
    if (isRestrictedChannel(ch) && !(isAdmin || isOwner)) {
        return;
    } else {
        attachMessageListeners(ref(db, currentPath));
    }
    if (typingRef) {
        try { off(typingRef, 'value'); } catch (e) { /* ignore */ }
        typingRef = null;
    }
    typingRef = ref(db, `typing/${ch}`);
    onValue(typingRef, (snap) => {
        const typingUsers = snap.val() || {};
        const names = Object.entries(typingUsers)
        .map(([_, val]) => (val && val.name) ? val.name : 'Someone');
        if (names.length > 0) {
            typingIndicator.textContent =
            names.length === 1
            ? `${names[0]} Is Typing...`
            : `${names.join(", ")} Are Typing...`;
            typingIndicator.style.display = "block";
        } else {
            typingIndicator.style.display = "none";
        }
    });
    clearChannelMention(ch);
    renderChannelsFromDB();
}
function startMetadataListener() {
    if (metadataListenerRef) return;
    metadataListenerRef = ref(db, `metadata/${currentUser.uid}/privateChats`);
    onValue(metadataListenerRef, snap => {
        const val = snap.exists() ? snap.val() : null;
        updatePrivateListFromSnapshot(val);
    });
}
sendBtn.onclick = async () => {
    if (!currentPath) return;
    let text = chatInput.value;
    const trimmed = text.trim();
    if (!trimmed) return;
    const muted = await isUserMuted(currentUser.uid);
    if (muted) {
        return;
    }
    const mentions = trimmed.match(/@\w+/g);
    if (mentions && mentions.length > 1) {
        showError("Only One Mention Per Message Is Allowed.");
        chatInput.value = "";
        return;
    }
    if (trimmed.length > 1000) {
        showError(`Your Message Is Too Long (${trimmed.length} Characters). Please Keep It Under 1000.`);
        chatInput.value = "";
        return;
    }
    const emailRef = ref(db, `users/${currentUser.uid}/settings/userEmail`);
    const emailSnap = await get(emailRef);
    if (!emailSnap.exists()) {
        await set(emailRef, currentUser.email);
    }
    let outgoingText = text;
    outgoingText = outgoingText.replace(/@hacker41(\b(?!\s*ðŸ’Ž))/gi, "@hacker41 ðŸ’Ž");
    const msg = {
        sender: currentUser.uid,
        text: outgoingText,
        timestamp: Date.now()
    };
    if (currentPrivateUid) {
        await sendPrivateMessage(currentPrivateUid, outgoingText);
    } else {
        if (currentPath === "messages/Admin-Chat" && !(isAdmin || isOwner)) {
            showError("You Cannot Send Messages To Admin Chat.");
            chatInput.value = "";
            return;
        }
        await push(ref(db, currentPath), msg);
    }
    chatInput.value = "";
    if (typingRef && currentUser) {
    const channelName = currentPath.split("/")[1];
    remove(ref(db, `typing/${channelName}/${currentUser.uid}`));
}

};
chatInput.addEventListener("input", () => {
    const mentions = chatInput.value.match(/@\w+/g);
    if (mentions && mentions.length > 1) {
        showError("Only One Mention Per Message Is Allowed.");
        chatInput.value = "";
    }
});
chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        if (e.shiftKey) {
            const start = chatInput.selectionStart;
            const end = chatInput.selectionEnd;
            chatInput.value = chatInput.value.substring(0, start) + "\n" + chatInput.value.substring(end);
            chatInput.selectionStart = chatInput.selectionEnd = start + 1;
            e.preventDefault();
        } else {
            e.preventDefault();
            sendBtn.click();
        }
    } else if (e.key === "Tab") {
        if (currentPrivateUid && currentPrivateName) {
            e.preventDefault();
            const pos = chatInput.selectionStart;
            const text = chatInput.value;
            let i = pos - 1;
            while (i >= 0 && /\S/.test(text[i])) i--;
            const tokenStart = i + 1;
            const token = text.substring(tokenStart, pos);
            if (token.startsWith("@")) {
                const nameToInsert = "@" + currentPrivateName.replace(/ ðŸ’Ž/g, "");
                const newValue = text.substring(0, tokenStart) + nameToInsert + text.substring(pos);
                chatInput.value = newValue;
                const newPos = tokenStart + nameToInsert.length;
                chatInput.selectionStart = chatInput.selectionEnd = newPos;
            } else {
            }
        }
    }
});
chatInput.addEventListener("input", () => {
    if (!currentUser || !currentPath || !currentPath.startsWith("messages/")) return;
    const ch = currentPath.split("/")[1];
    const thisTypingRef = ref(db, `typing/${ch}/${currentUser.uid}`);
    set(thisTypingRef, { name: currentName, typing: true });
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        remove(thisTypingRef);
    }, 3000);
});
sendBtn.addEventListener("click", async () => {
    const text = chatInput.value.trim();
    if (!text) return;
    if (!currentUser) return;
    const muted = await isUserMuted(currentUser.uid);
    if (muted) {
        showError("You Are Muted And Cannot Send Messages Right Now.");
        return;
    }
    if (!currentUser || !currentPath || !currentPath.startsWith("messages/")) return;
    const ch = currentPath.split("/")[1];
    remove(ref(db, `typing/${ch}/${currentUser.uid}`));
});
const mentionHint = document.getElementById("mentionHint");
chatInput.addEventListener("input", () => {
    const value = chatInput.value;
    const cursorPos = chatInput.selectionStart;
    const justTypedAt = value.slice(0, cursorPos).endsWith("@");
    const afterAt = /@[\w\d_-]{1,20}$/.test(value.slice(0, cursorPos));
    if (currentPrivateUid && justTypedAt) {
        mentionHint.textContent = `Press Tab To Mention ${currentPrivateName || "This User"}`;
        mentionHint.style.display = "block";
    } else if (!afterAt) {
        mentionHint.style.display = "none";
    }
});
chatInput.addEventListener("blur", () => {
    mentionHint.style.display = "none";
});
function setHeader(user, name) {
    usernameSpan.textContent = name;
    usernameSpan.style.color = currentColor;
    emailSpan.textContent = user.email;
    if (isOwner || user.email === "example@gmail.org") {
        roleSpan.textContent = "Owner"; roleSpan.className = "role-owner";
        roleSpan.style.color = "lime";
    } else if(["example@gmail.org"].includes(user.email)) {
        roleSpan.textContent = "Co-Owner"; roleSpan.className = "role-cOwner";
        roleSpan.style.color = "lightblue";
    } else if (["example@gmail.org", "example@gmail.org", "example@gmail.org", "example@gmail.org"].includes(user.email)) {
        roleSpan.textContent = "Admin"; roleSpan.className = "role-admin";
        roleSpan.style.color = "blue";
    } else if(user.email === "example@gmail.org") {
        roleSpan.textContent = "Tester"; roleSpan.className = "role-test";
        roleSpan.style.color = "darkgoldenrod";
    } else {
        roleSpan.textContent = "User"; roleSpan.className = "role-user";
        roleSpan.style.color = "white";
    }
}
onAuthStateChanged(auth, async user => {
    if (!user) { 
        showError("Not Logged In!"); 
        setTimeout(() => location.href = "/sm/login.html", 1000);
        return; 
    }
    currentUser = user;
    const ownerSnap = await get(ref(db, `users/${user.uid}/profile/isOwner`));
    isOwner = ownerSnap.exists() && ownerSnap.val() === true;
    if (user.email === "example@gmail.org") isOwner = true;
    isAdmin = ["ur-email@gmail.org", "example@gmail.org"]
               .includes(user.email);
    adminControls.style.display = (isAdmin || isOwner) ? "block" : "none";
    if (isAdmin && !isOwner) {
        newChannelName.style.display = "none";
        addChannelBtn.style.display = "none";
    }
    await ensureDisplayName(user);
    await loadMentionSetting(user);
    setHeader(user, currentName);
    startChannelListeners();
    await renderChannelsFromDB();
    if (currentPath && currentPath.includes("messages/Admin-Chat") && !(isAdmin || isOwner)) {
        switchChannel("General");
    }
    if (!currentPath) switchChannel("General");
    startMetadataListener();
    const mentionsRef = ref(db, `mentions/${currentUser.uid}`);
    onChildAdded(mentionsRef, snap => { console.log("Mention (db): ", snap.val()); });
    const storedUid = localStorage.getItem("openPrivateChatUid");
    if (storedUid) {
        getDisplayName(storedUid).then(name => {
            openPrivateChat(storedUid, name);
        });
        localStorage.removeItem("openPrivateChatUid");
    }
});
addChannelBtn.onclick = async () => {
    if (!(isOwner || currentUser.email === "example@gmail.org")) return;
    const name = newChannelName.value.trim();
    if (!name) return;
    await set(ref(db, `channels/${name}`), true);
    newChannelName.value = "";
};
chatInput.addEventListener("paste", (e) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
            e.preventDefault();
            showError("You Cannot Paste Images Unfortunately.");
            return;
        }
    }
});
let currentSuccessDiv = null;
function showSuccess(message) {
    if (currentSuccessDiv) currentSuccessDiv.remove();
    const successDiv = document.createElement("div");
    successDiv.textContent = message;
    Object.assign(successDiv.style, {
        position: "fixed",
        top: header ? `${header.offsetHeight + 10}px` : "10px",
        left: "50%",
        transform: "translateX(-50%)",
        backgroundColor: "seagreen",
        color: "black",
        border: "2px solid green",
        borderRadius: "8px",
        padding: "10px 20px",
        zIndex: 9999,
        cursor: "pointer",
        maxWidth: "90%",
        textAlign: "center",
        fontWeight: "bold",
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
    });
    successDiv.addEventListener("click", () => {
        successDiv.remove();
        currentSuccessDiv = null;
    });
    document.body.appendChild(successDiv);
    currentSuccessDiv = successDiv;
}
