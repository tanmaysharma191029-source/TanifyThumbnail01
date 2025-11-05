// CONFIG
const WA  = "918741872408";           // WhatsApp
const UPI = "8741872408@fam";         // UPI
const QR_PATH = "/assets/upi-qr.png"; // apna QR image yahi naam se rakho

// PLANS
const TIERS = {
  basic:    { id: "basic",    name: "Basic",    price: 5,  thumbnails: 1, delivery: "Same day" },
  standard: { id: "standard", name: "Standard", price: 10, thumbnails: 2, delivery: "3 days" },
  premium:  { id: "premium",  name: "Premium",  price: 15, thumbnails: 3, delivery: "3 days" },
};

// CATEGORIES
const CATEGORIES = ["Vlog","Education","Gaming","Tech","Other"];
let selectedTier = TIERS.basic;
let selectedCategories = ["Vlog"];

// particles background (soft dots)
const canvas = document.getElementById("bg-canvas");
const ctx = canvas.getContext("2d",{alpha:true});
let dots = [];
function resize(){ canvas.width = innerWidth; canvas.height = innerHeight; }
function makeDots(){
  const count = Math.min(140, Math.floor((canvas.width*canvas.height)/18000));
  dots = new Array(count).fill(0).map(()=>({
    x: Math.random()*canvas.width,
    y: Math.random()*canvas.height,
    r: Math.random()*1.8 + 0.6,
    a: Math.random()*0.55 + 0.15,
    vx: (Math.random()-0.5)*0.15,
    vy: (Math.random()-0.5)*0.15,
    hue: [0,45,210][Math.floor(Math.random()*3)]
  }));
}
function tick(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  dots.forEach(d=>{
    d.x+=d.vx; d.y+=d.vy;
    if(d.x<0||d.x>canvas.width) d.vx*=-1;
    if(d.y<0||d.y>canvas.height) d.vy*=-1;
    const g=ctx.createRadialGradient(d.x,d.y,0,d.x,d.y,d.r*6);
    g.addColorStop(0,`hsla(${d.hue},95%,60%,${d.a})`);
    g.addColorStop(1,`hsla(${d.hue},95%,60%,0)`);
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(d.x,d.y,d.r*6,0,Math.PI*2); ctx.fill();
  });
  requestAnimationFrame(tick);
}
addEventListener("resize", ()=>{resize(); makeDots();});
resize(); makeDots(); tick();

// helpers
function renderCategories(){
  const wrap = document.getElementById("category-chips");
  wrap.innerHTML = "";
  CATEGORIES.forEach(cat=>{
    const on = selectedCategories.includes(cat);
    const el = document.createElement("label");
    el.className = "chip";
    el.innerHTML = `<input type="checkbox" ${on?"checked":""}/> ${cat}`;
    el.querySelector("input").addEventListener("change",(e)=>{
      if(e.target.checked) selectedCategories.push(cat);
      else selectedCategories = selectedCategories.filter(c=>c!==cat);
    });
    wrap.appendChild(el);
  });
}
function updateSelectedPlanText(){
  const t = selectedTier;
  document.getElementById("selected-plan").textContent =
    `${t.name} – $${t.price} • ${t.thumbnails} thumbnail${t.thumbnails>1?'s':''} • ${t.delivery}`;
}
function whatsappMessage(p){
  return [
    `New Thumbnail Order`,
    `Name: ${p.name}`,
    `Email: ${p.email || '-'}`,
    `Plan: ${p.tierName} ($${p.priceUSD})`,
    `Thumbnails: ${p.thumbnails}`,
    `Categories: ${p.categories}`,
    `Video Title: ${p.videoTitle || '-'}`,
    `Style/Notes: ${p.styleNotes || '-'}`,
    `Delivery: ${p.delivery}`,
  ].join('\n');
}
function upiIntent(amount){
  if(!UPI) return "";
  const params = new URLSearchParams({ pa: UPI, pn: "Tanify Thumbnails", cu: "INR" });
  if(amount) params.set("am", String(amount));
  return "upi://pay?" + params.toString();
}

// init
document.addEventListener("DOMContentLoaded", ()=>{
  document.getElementById("year").textContent = new Date().getFullYear();
  document.getElementById("upiDisplay").textContent = UPI;

  document.querySelectorAll(".select-plan").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      selectedTier = TIERS[btn.dataset.id];
      updateSelectedPlanText();
      btn.closest(".card").classList.add("selected");
      document.querySelectorAll(".card.hover").forEach(c=>{
        if(c !== btn.closest(".card")) c.classList.remove("selected");
      });
    });
  });
  renderCategories(); updateSelectedPlanText();

  // UPI app open (mobile)
  const upiBtn = document.getElementById("upiButton");
  upiBtn.addEventListener("click", (e)=>{
    const url = upiIntent(); // set amount if needed: upiIntent(199)
    if(url) upiBtn.href = url; else { e.preventDefault(); alert("UPI ID not configured."); }
  });

  // QR modal show (your image)
  const qrBtn = document.getElementById("qrButton");
  const modal = document.getElementById("qrModal");
  const qrImg = document.getElementById("qrImg");
  const qrClose = document.getElementById("qrClose");
  document.getElementById("upiTextInline").textContent = UPI;

  qrBtn.addEventListener("click", ()=>{
    qrImg.src = QR_PATH;         // yahi pe aap apni QR image rakhenge
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden","false");
  });
  qrClose.addEventListener("click", ()=>{
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden","true");
  });
  modal.addEventListener("click", (e)=>{
    if(e.target === modal){
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden","true");
    }
  });

  // Confirm flow
  document.getElementById("confirm").addEventListener("click", async ()=>{
    const name = document.getElementById("name").value.trim() || "Customer";
    const email = document.getElementById("email").value.trim() || null;
    const contactMethod = document.querySelector('input[name="contact"]:checked').value;
    const videoTitle = document.getElementById("videoTitle").value.trim() || null;
    const styleNotes = document.getElementById("styleNotes").value.trim() || null;

    const payload = {
      name, email,
      tierName: selectedTier.name,
      priceUSD: selectedTier.price,
      thumbnails: selectedTier.thumbnails,
      categories: selectedCategories.join(", "),
      videoTitle, styleNotes,
      delivery: selectedTier.delivery,
    };

    const msg = encodeURIComponent(whatsappMessage(payload));
    if(contactMethod === "whatsapp"){
      window.open(`https://wa.me/${WA}?text=${msg}`, "_blank");
    }else if(email){
      window.location.href = `mailto:${email}?subject=${encodeURIComponent("Thumbnail Order")}&body=${msg}`;
    }else{
      alert("Email not provided. Please choose WhatsApp or enter email.");
    }

    // Optional backend save:
    try{
      await fetch("/api/order", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify(payload)
      });
    }catch(e){ /* ignore if no backend */ }
  });
});
