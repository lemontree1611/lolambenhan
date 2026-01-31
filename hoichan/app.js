// === TẠM THỜI: test UI offline trước ===
// Khi bạn có backend, mình sẽ thay bằng socket + Google verify.
let canSendAt = 0;

const $ = (id) => document.getElementById(id);
const show = (el, yes) => el.classList.toggle("hidden", !yes);

// 1) Login overlay: tạm cho bạn bấm "fake login" bằng cách ẩn overlay
// Khi làm thật: Google callback sẽ gọi hide overlay và set username
window.onGoogleCredential = () => {}; // placeholder để tránh lỗi nếu chưa cấu hình

// Nếu bạn chưa làm Google Client ID, tạm comment overlay để test UI:
// show($("loginOverlay"), false);

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

  renderLocalMessage({ userName: "Bạn", text });
  $("input").value = "";

  canSendAt = Date.now() + 5000;
  startCooldown(5000);
}

$("send").disabled = false;
$("send").onclick = sendTextLocal;
$("input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendTextLocal();
});

// Upload ảnh: tạm dùng file local preview (không cần Cloudinary để test UI)
$("btnImg").onclick = async () => {
  const picker = document.createElement("input");
  picker.type = "file";
  picker.accept = "image/*";
  picker.onchange = () => {
    const file = picker.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    renderLocalMessage({ userName: "Bạn", imageUrl: url });
  };
  picker.click();
};
