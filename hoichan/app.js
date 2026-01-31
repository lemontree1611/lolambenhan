let canSendAt = 0;

const $ = (id) => document.getElementById(id);
const show = (el, yes) => el.classList.toggle("hidden", !yes);

// ✅ DÁN CLIENT ID CỦA BẠN
const GOOGLE_CLIENT_ID =
  "809932517901-53dirqapfjqbroadjilk8oeqtj0qugfj.apps.googleusercontent.com";

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

// ✅ Render nút Google full width theo khung loginCard
function renderGoogleButton() {
  const host = $("gBtn");
  const card = document.querySelector(".loginCard");
  if (!host || !card) return;

  host.innerHTML = "";
  const width = Math.floor(card.clientWidth); // full width

  // Đợi script GIS sẵn sàng
  if (!window.google?.accounts?.id) return;

  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (resp) => {
      try {
        // decode JWT payload (demo frontend)
        const payload = JSON.parse(atob(resp.credential.split(".")[1]));
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
    width, // ✅ full width
  });
}

// Chờ GIS load xong rồi render (vì script async defer)
window.addEventListener("load", () => {
  const t = setInterval(() => {
    if (window.google?.accounts?.id) {
      clearInterval(t);
      renderGoogleButton();
      window.addEventListener("resize", renderGoogleButton);
    }
  }, 100);
});

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

function renderLocalMessage({ userName, text, imageUrl }) {
  const msg = {
    id: crypto.randomUUID(),
    userName,
    text,
    imageUrl,
    createdAt: new Date().toISOString(),
    hearts: 0
  };

  const wrap = document.createElement("div");
  wrap.className = "msg";
  wrap.innerHTML = `
    <div class="bubble">
      <div class="meta">
        <span class="name">${escapeHtml(msg.userName)}</span>
        <span class="time">${new Date(msg.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
      </div>
      ${msg.text ? `<div class="text">${escapeHtml(msg.text)}</div>` : ""}
      ${msg.imageUrl ? `<img class="img" src="${msg.imageUrl}" alt="image" />` : ""}
      <button class="heart" data-id="${msg.id}">❤️ <span>${msg.hearts}</span></button>
    </div>
  `;

  const heartBtn = wrap.querySelector(".heart");
  heartBtn.onclick = () => {
    msg.hearts += 1;
    heartBtn.querySelector("span").textContent = msg.hearts;
  };

  $("messages").appendChild(wrap);
  $("messages").scrollTop = $("messages").scrollHeight;
}

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

  const name = $("me").textContent?.trim() || "Bạn";
  renderLocalMessage({ userName: name, text });
  $("input").value = "";

  canSendAt = Date.now() + 5000;
  startCooldown(5000);
}

// ⚠️ Ban đầu vẫn disable cho tới khi login xong
$("send").disabled = true;
$("send").onclick = sendTextLocal;
$("input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendTextLocal();
});

// Upload ảnh local preview
$("btnImg").onclick = async () => {
  const picker = document.createElement("input");
  picker.type = "file";
  picker.accept = "image/*";
  picker.onchange = () => {
    const file = picker.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const name = $("me").textContent?.trim() || "Bạn";
    renderLocalMessage({ userName: name, imageUrl: url });
  };
  picker.click();
};
