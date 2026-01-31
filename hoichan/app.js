let canSendAt = 0;

const $ = (id) => document.getElementById(id);
const show = (el, yes) => el.classList.toggle("hidden", !yes);

// ✅ Client ID của bạn
const GOOGLE_CLIENT_ID =
  "809932517901-53dirqapfjqbroadjilk8oeqtj0qugfj.apps.googleusercontent.com";

/* ✅ Decode JWT payload đúng UTF-8 (không lỗi TrÃ­ LÃª) */
function base64UrlToUint8Array(base64Url) {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function decodeJwtPayloadUtf8(jwt) {
  const payloadPart = jwt.split(".")[1];
  const bytes = base64UrlToUint8Array(payloadPart);
  const json = new TextDecoder("utf-8").decode(bytes);
  return JSON.parse(json);
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[c]);
}

function myName() {
  return $("me")?.textContent?.trim() || "";
}

function hideLoginOverlay() {
  const ov = $("loginOverlay");
  if (!ov) return;
  ov.classList.add("hidden");
  ov.style.display = "none"; // ăn chắc
}

function onLoginSuccess(payload) {
  $("me").textContent = payload?.name || "User";
  $("status").textContent = "Đã đăng nhập";
  hideLoginOverlay();
  $("send").disabled = false;
}

/* ✅ Render Google button full width */
function renderGoogleButton() {
  const host = $("gBtn");
  const card = document.querySelector(".loginCard");
  if (!host || !card) return;

  host.innerHTML = "";
  const width = Math.floor(card.clientWidth);

  if (!window.google?.accounts?.id) return;

  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (resp) => {
      try {
        const payload = decodeJwtPayloadUtf8(resp.credential);
        onLoginSuccess(payload);
      } catch (e) {
        console.error("Decode token failed", e);
        alert("Login xong nhưng đọc thông tin lỗi. Thử lại nhé.");
      }
    },
  });

  google.accounts.id.renderButton(host, {
    theme: "outline",
    size: "large",
    text: "signin_with",
    shape: "pill",
    width,
  });
}

/* ✅ Boot */
window.addEventListener("load", () => {
  const t = setInterval(() => {
    if (window.google?.accounts?.id) {
      clearInterval(t);
      renderGoogleButton();
      window.addEventListener("resize", renderGoogleButton);
    }
  }, 100);
});

/* ===== Chat UI (local demo) ===== */

function scrollBottom() {
  const box = $("messages");
  box.scrollTop = box.scrollHeight;
}

/**
 * Render message bubble.
 * - mine: right + blue (CSS handles via .msg.me)
 * - mine cannot heart (disabled) but show count
 */
function renderLocalMessage({ userName, text, imageUrl, hearts = 0 }) {
  const msg = {
    id: crypto.randomUUID(),
    userName,
    text: text ?? "",
    imageUrl: imageUrl ?? null,
    createdAt: new Date().toISOString(),
    hearts: Number.isFinite(hearts) ? hearts : 0,
  };

  const isMine = msg.userName === myName();

  const wrap = document.createElement("div");
  wrap.className = "msg" + (isMine ? " me" : "");

  const timeStr = new Date(msg.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  wrap.innerHTML = `
    <div class="bubble">
      <div class="meta">
        <span class="name">${escapeHtml(msg.userName)}</span>
        <span class="time">${escapeHtml(timeStr)}</span>
      </div>

      ${msg.text ? `<div class="text">${escapeHtml(msg.text)}</div>` : ""}
      ${msg.imageUrl ? `<img class="img" src="${msg.imageUrl}" alt="image" />` : ""}

      <button class="heart" data-id="${msg.id}" ${isMine ? "disabled" : ""} aria-label="Thả tim">
        ❤️ <span>${msg.hearts}</span>
      </button>
    </div>
  `;

  const heartBtn = wrap.querySelector(".heart");

  // ✅ Chỉ cho thả tim tin người khác
  if (!isMine) {
    heartBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      msg.hearts += 1;
      heartBtn.querySelector("span").textContent = msg.hearts;
    });
  }

  $("messages").appendChild(wrap);
  scrollBottom();
}

/* ===== Cooldown 5s ===== */
let cooldownTimer = null;

function startCooldown(ms) {
  clearInterval(cooldownTimer);
  show($("cooldown"), true);
  $("send").disabled = true;

  const end = Date.now() + ms;
  cooldownTimer = setInterval(() => {
    const left = Math.max(0, end - Date.now());
    $("cooldown").textContent = `Chờ ${Math.ceil(left / 1000)}s để gửi tiếp…`;
    if (left <= 0) {
      clearInterval(cooldownTimer);
      show($("cooldown"), false);
      $("send").disabled = false;
    }
  }, 200);
}

function sendTextLocal() {
  const now = Date.now();
  if (now < canSendAt) {
    startCooldown(canSendAt - now);
    return;
  }

  const text = $("input").value.trim();
  if (!text) return;

  renderLocalMessage({ userName: myName() || "Bạn", text });

  $("input").value = "";
  canSendAt = Date.now() + 5000;
  startCooldown(5000);
}

/* ===== Bind UI ===== */
// Ban đầu disable cho tới khi login thành công
$("send").disabled = true;

$("send").addEventListener("click", sendTextLocal);
$("input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendTextLocal();
});

// Upload ảnh local preview
$("btnImg").addEventListener("click", () => {
  const picker = document.createElement("input");
  picker.type = "file";
  picker.accept = "image/*";
  picker.onchange = () => {
    const file = picker.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    renderLocalMessage({ userName: myName() || "Bạn", imageUrl: url });
  };
  picker.click();
});
