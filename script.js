/* =========================================================
   DETEKTIF ANGKA - Bongkar Miskonsepsi Nilai Tempat
   script.js - logika permainan
   ========================================================= */

const WITNESS_NAMES = ["Beni","Rina","Sari","Doni","Made","Wulan","Andi","Citra","Tio","Nina"];
const WITNESS_AVATARS = ["🧒","👧","🧑","👦","🙋‍♀️","🙋‍♂️"];
const PLACE_COLORS = { ratusan:"#FF6B6B", puluhan:"#6BCB77", satuan:"#4D96FF" };
const PLACE_LABELS = { ratusan:"ratusan", puluhan:"puluhan", satuan:"satuan" };
const CASES_PER_LEVEL = 5;
const POINTS_PER_CASE = 20;

function randInt(min, max){ return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr){ return arr[randInt(0, arr.length - 1)]; }
function randomWitness(){ return { name: pick(WITNESS_NAMES), avatar: pick(WITNESS_AVATARS) }; }

/* ---------------------------------------------------------
   GENERATOR KASUS PER LEVEL
   Setiap kasus: { witness, claimText, isTrue, breakdown }
   breakdown.mode = 'decompose' | 'compare'
--------------------------------------------------------- */

function makeDecomposeCase(digits, places, forceTrue){
  // digits: array of digit values sesuai posisi (index 0 = paling besar nilai tempatnya)
  const number = parseInt(digits.join(''), 10);
  const values = digits.map((d,i)=> d * Math.pow(10, places.length - 1 - i));
  const isTrue = forceTrue !== undefined ? forceTrue : Math.random() < 0.5;

  let claimText, targetInfo = null;
  const useDigitValueStyle = Math.random() < 0.5 && places.length > 1;

  if(useDigitValueStyle){
    // pilih salah satu digit bukan yang terakhir (agar bukan satuan, lebih menantang), boleh 0 pada level lanjutan
    const candidates = places.map((p,i)=>i).filter(i=> places[i] !== 'satuan' || places.length === 1);
    const idx = pick(candidates);
    const digit = digits[idx];
    const trueVal = values[idx];
    const shownVal = isTrue ? trueVal : digit; // klaim salah = anggap nilai sama dengan digit itu sendiri
    claimText = `Pada bilangan ${number}, angka ${digit} yang menempati tempat ${places[idx]} bernilai ${shownVal}.`;
    if(!isTrue && trueVal === digit){
      // jika trueVal sama dgn digit (digit di satuan) klaim otomatis benar -> paksa true
      return makeDecomposeCase(digits, places, true);
    }
    targetInfo = idx;
  } else {
    // gaya penjumlahan
    const trueSum = digits.reduce((acc,d,i)=> acc + values[i], 0); // == number
    const wrongSum = digits.reduce((acc,d)=> acc + d, 0); // jumlah digit polos
    if(!isTrue && wrongSum === trueSum){
      return makeDecomposeCase(digits, places, true);
    }
    const shownParts = isTrue ? values : digits;
    claimText = `${number} = ${shownParts.join(' + ')}`;
  }

  return {
    witness: randomWitness(),
    claimText,
    isTrue,
    breakdown: { mode:'decompose', number, digits, places, values, highlightIdx: targetInfo }
  };
}

function makeCompareCase(){
  // bandingkan bilangan 2 digit vs 3 digit untuk menyasar miskonsepsi "banyak angka besar = lebih besar"
  const twoDigit = randInt(20, 98);
  let threeDigit = randInt(101, 299);
  if(threeDigit === twoDigit) threeDigit += 3;
  const threeIsBigger = threeDigit > twoDigit; // hampir selalu true karena jumlah digit lebih banyak

  // acak posisi bilangan mana yang disebut lebih besar dalam kalimat klaim
  const claimText = Math.random() < 0.5
    ? `${twoDigit} lebih besar daripada ${threeDigit}.`
    : `${threeDigit} lebih besar daripada ${twoDigit}.`;
  const isTrue = claimText.startsWith(String(threeDigit)) ? threeIsBigger : !threeIsBigger;

  return {
    witness: randomWitness(),
    claimText,
    isTrue,
    breakdown: { mode:'compare', a: twoDigit, b: threeDigit, bigger: threeIsBigger ? threeDigit : twoDigit }
  };
}

function generateLevel1(){
  // Satuan & Puluhan (bilangan 2 digit)
  const cases = [];
  for(let i=0;i<CASES_PER_LEVEL;i++){
    const t = randInt(1,9);
    const s = randInt(0,9);
    cases.push(makeDecomposeCase([t,s], ['puluhan','satuan']));
  }
  return cases;
}

function generateLevel2(){
  // Ratusan, puluhan, satuan (bilangan 3 digit tanpa nol)
  const cases = [];
  for(let i=0;i<CASES_PER_LEVEL;i++){
    const h = randInt(1,9);
    const t = randInt(1,9);
    const s = randInt(0,9);
    cases.push(makeDecomposeCase([h,t,s], ['ratusan','puluhan','satuan']));
  }
  return cases;
}

function generateLevel3(){
  // Miskonsepsi bilangan tiga angka: termasuk nol sebagai penanda tempat & perbandingan bilangan
  const cases = [];
  for(let i=0;i<CASES_PER_LEVEL;i++){
    if(i === Math.floor(CASES_PER_LEVEL/2)){
      cases.push(makeCompareCase());
      continue;
    }
    const h = randInt(1,9);
    const t = Math.random() < 0.5 ? 0 : randInt(1,9);
    const s = randInt(0,9);
    cases.push(makeDecomposeCase([h,t,s], ['ratusan','puluhan','satuan']));
  }
  return cases;
}

const LEVELS = [
  {
    id: 1,
    eyebrow: "LEVEL 1",
    name: "Misi Detektif Pemula",
    materi: "Materi: Satuan dan Puluhan",
    generator: generateLevel1
  },
  {
    id: 2,
    eyebrow: "LEVEL 2",
    name: "Misi Detektif Cerdas",
    materi: "Materi: Ratusan, Puluhan, dan Satuan",
    generator: generateLevel2
  },
  {
    id: 3,
    eyebrow: "LEVEL 3",
    name: "Misi Detektif Ahli",
    materi: "Materi: Miskonsepsi Bilangan Tiga Angka",
    generator: generateLevel3
  }
];

/* ---------------------------------------------------------
   STATE
--------------------------------------------------------- */
const state = {
  levelIdx: 0,
  caseIdx: 0,
  cases: [],
  selected: null,
  correctInLevel: 0,
  totalScore: 0,
  perLevelResult: []
};

/* ---------------------------------------------------------
   SOUND EFFECT
--------------------------------------------------------- */

const sfx = {

    benar: new Audio("audio/benar.wav"),

  salah: new Audio("audio/salah.wav"),

  level: new Audio("audio/levelup.wav"),

  finish: new Audio("audio/finish.wav")

};

let soundEnabled = true;

Object.values(sfx).forEach(audio => {

  audio.preload = "auto";

  audio.volume = 0.5;

});

function playSound(name){

    if(!soundEnabled) return;

    if(!sfx[name]) return;

    sfx[name].pause();

    sfx[name].currentTime = 0;

    sfx[name].play().catch(()=>{});

}

let resultChart = null;

/* ---------------------------------------------------------
   DOM HELPERS
--------------------------------------------------------- */
const $ = (id) => document.getElementById(id);
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
}
function setTopbar(visible){
  $('topbar').classList.toggle('hidden', !visible);
}
function updateTopbarStats(){
  $('levelChip').textContent = `Level ${LEVELS[state.levelIdx].id}`;
  $('topScore').textContent = state.totalScore;
}

/* ---------------------------------------------------------
   OPENING + PETUNJUK
--------------------------------------------------------- */
$('btnMulai').addEventListener('click', () => {
  state.levelIdx = 0;
  state.totalScore = 0;
  state.perLevelResult = [];
  startLevelIntro();
});
$('btnPetunjuk').addEventListener('click', () => $('modalPetunjuk').classList.remove('hidden'));
$('btnTutupPetunjuk').addEventListener('click', () => $('modalPetunjuk').classList.add('hidden'));
$('btnPetunjukSelesai').addEventListener('click', () => $('modalPetunjuk').classList.add('hidden'));

/* ---------------------------------------------------------
   MODAL INFORMASI
--------------------------------------------------------- */

$('btnInfo').addEventListener('click', () => {
  $('modalInfo').classList.remove('hidden');
});

$('btnTutupInfo').addEventListener('click', () => {
  $('modalInfo').classList.add('hidden');
});

/* Tutup modal jika klik area luar */
$('modalInfo').addEventListener('click', (e) => {
  if (e.target.id === 'modalInfo') {
    $('modalInfo').classList.add('hidden');
  }
});

/* ---------------------------------------------------------
   LEVEL INTRO
--------------------------------------------------------- */
function startLevelIntro(){
  const lv = LEVELS[state.levelIdx];
  $('levelIntroEyebrow').textContent = lv.eyebrow;
  $('levelIntroName').textContent = lv.name;
  $('levelIntroMateri').textContent = lv.materi;
  $('levelIntroCount').textContent = `${CASES_PER_LEVEL} Kasus`;
  setTopbar(true);
  updateTopbarStats();
  showScreen('screen-level-intro');
}

$('btnMulaiMisi').addEventListener('click', () => {
  const lv = LEVELS[state.levelIdx];
  state.cases = lv.generator();
  state.caseIdx = 0;
  state.correctInLevel = 0;
  renderCase();
  showScreen('screen-game');
});

/* ---------------------------------------------------------
   GAMEPLAY - KARTU KASUS
--------------------------------------------------------- */
function renderCase(){
  const c = state.cases[state.caseIdx];
  state.selected = null;

  $('caseNumber').textContent = String(state.caseIdx + 1).padStart(2,'0');
  $('caseProgressLabel').textContent = `Kasus ${state.caseIdx + 1} / ${CASES_PER_LEVEL}`;
  $('caseProgressFill').style.width = `${Math.round(((state.caseIdx) / CASES_PER_LEVEL) * 100)}%`;

  $('witnessName').textContent = c.witness.name;
  $('witnessAvatar').textContent = c.witness.avatar;
  $('claimText').textContent = c.claimText;

  document.querySelectorAll('.tf-btn').forEach(b => {
    b.disabled = false;
    b.classList.remove('selected','correct-reveal','wrong-reveal');
  });
  $('btnPeriksa').disabled = true;
  $('feedbackBox').classList.add('hidden');
  $('breakdownBox').innerHTML = '';
}

document.querySelectorAll('.tf-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if(btn.disabled) return;
    document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    state.selected = btn.dataset.answer; // 'benar' | 'salah'
    $('btnPeriksa').disabled = false;
  });
});

$('btnPeriksa').addEventListener('click', () => {
  const c = state.cases[state.caseIdx];
  const userSaysTrue = state.selected === 'benar';
  const isCorrect = userSaysTrue === c.isTrue;

  document.querySelectorAll('.tf-btn').forEach(b => {
    b.disabled = true;
    const isTrueBtn = b.dataset.answer === 'benar';
    if(isTrueBtn === c.isTrue){
      b.classList.add('correct-reveal');
    } else if(b.classList.contains('selected') && !isCorrect){
      b.classList.add('wrong-reveal');
    }
  });

  if(isCorrect){

    playSound("benar");

    state.correctInLevel += 1;

    state.totalScore += POINTS_PER_CASE;

    $('feedbackHeadline').textContent =
        '🎉 Hebat! Kamu menemukan miskonsepsi.';

} else {

    playSound("salah");

    $('feedbackHeadline').textContent =
        '🔍 Perhatikan kembali nilai tempatnya.';

}

updateTopbarStats();

renderBreakdown(c.breakdown);

$('feedbackBox').classList.remove('hidden');

$('caseProgressFill').style.width =
`${Math.round(((state.caseIdx + 1) / CASES_PER_LEVEL) * 100)}%`;
});

function renderBreakdown(b){
  const box = $('breakdownBox');
  box.innerHTML = '';

  if(b.mode === 'decompose'){
    const title = document.createElement('div');
    title.className = 'breakdown-number';
    title.textContent = b.number;
    box.appendChild(title);

    b.digits.forEach((d, i) => {
      const place = b.places[i];
      const row = document.createElement('div');
      row.className = 'breakdown-row';
      row.innerHTML = `
        <div class="breakdown-digit" style="background:${PLACE_COLORS[place]}">${d}</div>
        <span>${d} (${PLACE_LABELS[place]})</span>
        <span class="breakdown-eq">=</span>
        <b>${b.values[i]}</b>
      `;
      box.appendChild(row);
    });
    const sumRow = document.createElement('div');
    sumRow.className = 'breakdown-row';
    sumRow.style.marginTop = '8px';
    sumRow.innerHTML = `<span class="breakdown-eq">Jumlah nilai = ${b.values.join(' + ')} = <b>${b.number}</b></span>`;
    box.appendChild(sumRow);
  } else if(b.mode === 'compare'){
    const title = document.createElement('div');
    title.className = 'breakdown-number';
    title.textContent = `${b.a}  vs  ${b.b}`;
    box.appendChild(title);
    const row = document.createElement('div');
    row.className = 'breakdown-row';
    row.innerHTML = `<span>Bilangan dengan lebih banyak angka (digit) pada posisi tertinggi bernilai lebih besar. <b>${b.bigger}</b> lebih besar daripada <b>${b.bigger === b.a ? b.b : b.a}</b>.</span>`;
    box.appendChild(row);
  }
}

$('btnLanjutKasus').addEventListener('click', () => {
  state.caseIdx += 1;
  if(state.caseIdx >= CASES_PER_LEVEL){
    finishLevel();
  } else {
    renderCase();
  }
});

/* ---------------------------------------------------------
   RINGKASAN LEVEL
--------------------------------------------------------- */
function finishLevel(){
  const lv = LEVELS[state.levelIdx];
  const scoreThisLevel = state.correctInLevel * POINTS_PER_CASE;
  const maxScore = CASES_PER_LEVEL * POINTS_PER_CASE;
  const stars = state.correctInLevel; // 1 kasus benar = 1 bintang (maks 5)

  state.perLevelResult.push({ name: lv.name, score: scoreThisLevel, stars, correct: state.correctInLevel });

  $('summaryLevelName').textContent = lv.name;
  $('summaryScoreText').textContent = `${scoreThisLevel}/${maxScore}`;
  $('summaryStars').textContent = '⭐'.repeat(Math.max(stars,0)) + '☆'.repeat(CASES_PER_LEVEL - stars);
  $('summaryDetail').textContent = `Kamu menjawab ${state.correctInLevel} dari ${CASES_PER_LEVEL} kasus dengan benar!`;

  const isLastLevel = state.levelIdx >= LEVELS.length - 1;
  $('btnLanjutLevel').textContent = isLastLevel ? 'LIHAT SERTIFIKAT 🏅' : 'LANJUT KE LEVEL BERIKUTNYA ➜';

  showScreen('screen-level-summary');
}

$('btnLanjutLevel').addEventListener('click', () => {

    const isLastLevel =
        state.levelIdx >= LEVELS.length - 1;

    if(isLastLevel){

        showResultScreen();

    } else {

        playSound("level");

        state.levelIdx += 1;

        setTimeout(()=>{

            startLevelIntro();

        },800);

    }

});

/* ---------------------------------------------------------
   SERTIFIKAT
--------------------------------------------------------- */
function showCertificateSetup(){
  const maxTotal = LEVELS.length * CASES_PER_LEVEL * POINTS_PER_CASE;
  $('certScore').textContent = `${state.totalScore}/${maxTotal}`;
  const overallStars = Math.max(1, Math.round((state.totalScore / maxTotal) * 5));
  $('certStars').textContent =
    '★'.repeat(overallStars) +
    '☆'.repeat(5 - overallStars);
  setTopbar(false);
  showScreen('screen-certificate');
  playConfetti();
  $('inputNama').value = '';
  $('certName').textContent = 'Nama Detektif';
}

$('btnCetakSertifikat').addEventListener('click', () => {
  
  console.log("Tombol Sertifikat diklik");

    const nama = $('inputNama').value.trim();

    $('certName').textContent =
        nama.length > 0 ? nama : 'Detektif Cilik';

    /* ==========================
       TANGGAL OTOMATIS
    ========================== */

    const tanggal = new Date();

    const opsi = {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    };

    $('certDate').textContent =
        tanggal.toLocaleDateString('id-ID', opsi);
        /* ==========================
   NOMOR SERTIFIKAT OTOMATIS
========================== */

const tahun = tanggal.getFullYear();

const bulan = String(tanggal.getMonth() + 1).padStart(2,'0');

const hari = String(tanggal.getDate()).padStart(2,'0');

const random = Math.floor(Math.random()*900)+100;

$('certNumber').textContent =
`DA-${tahun}${bulan}${hari}-${random}`;

    $('certCard').scrollIntoView({
        behavior:'smooth',
        block:'center'
    });

});

/* =====================================================
   MAIN LAGI
===================================================== */

$('btnUlangi').addEventListener('click', () => {

    location.reload();

});
/* =====================================================
   DOWNLOAD PDF SERTIFIKAT
===================================================== */

$('btnDownloadPDF').addEventListener('click', async () => {

    const nama = $('inputNama').value.trim();

    if (nama.length < 3) {
        $('namaError').classList.remove('hidden');
        $('inputNama').focus();
        return;
    }

    $('namaError').classList.add('hidden');

    const cert = $('certCard');

    /* ==============================
       SIMPAN STYLE ASLI
    ============================== */

    const oldWidth = cert.style.width;
    const oldMinHeight = cert.style.minHeight;
    const oldPadding = cert.style.padding;
    const oldBorder = cert.style.borderWidth;

    /* ==============================
       UBAH KE UKURAN A4
    ============================== */

    cert.style.width = "794px";
    cert.style.minHeight = "1123px";
    cert.style.padding = "35px";
    cert.style.borderWidth = "10px";

    await new Promise(resolve => setTimeout(resolve, 300));

    /* ==============================
       HTML2CANVAS
    ============================== */

    const canvas = await html2canvas(cert, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff"
    });

    /* ==============================
       KEMBALIKAN STYLE HP
    ============================== */

    cert.style.width = oldWidth;
    cert.style.minHeight = oldMinHeight;
    cert.style.padding = oldPadding;
    cert.style.borderWidth = oldBorder;

    const imgData = canvas.toDataURL("image/png");

    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
    });

    pdf.addImage(
    imgData,
    "PNG",
    3,
    3,
    204,
    291
);

    pdf.save(`Sertifikat_Detektif_Angka_${nama}.pdf`);

});

/* =====================================================
   CONFETTI
===================================================== */

function playConfetti(){

    const duration = 4000;

    const end = Date.now() + duration;

    (function frame(){

        confetti({
            particleCount:4,
            angle:60,
            spread:65,
            origin:{x:0}
        });

        confetti({
            particleCount:4,
            angle:120,
            spread:65,
            origin:{x:1}
        });

        if(Date.now() < end){

            requestAnimationFrame(frame);

        }

    })();

}
/* =====================================================
   HASIL BELAJAR
===================================================== */

function showResultScreen(){

    const totalSoal =
        LEVELS.length * CASES_PER_LEVEL;

    const benar =
        Math.round(state.totalScore / POINTS_PER_CASE);

    const salah =
        totalSoal - benar;

    const akurasi =
        Math.round((benar / totalSoal) * 100);

    $('resultScore').textContent =
        state.totalScore;

    $('resultCorrect').textContent =
        benar;

    $('resultWrong').textContent =
        salah;

    $('resultAccuracy').textContent =
        akurasi + "%";

    let predikat = "";

if(akurasi >= 95){

    predikat = "🏆 DETEKTIF LEGENDARIS";

}
else if(akurasi >= 80){

    predikat = "🥇 DETEKTIF AHLI";

}
else if(akurasi >= 60){

    predikat = "🥈 DETEKTIF CERDAS";

}
else{

    predikat = "🥉 DETEKTIF PEMULA";

}

$('resultRank').textContent = predikat;

    drawResultChart(benar,salah);
    
    playSound("finish");

    showScreen('screen-result');

}
$('btnLihatSertifikat').addEventListener('click',()=>{

    showCertificateSetup();

});
/* =====================================================
   CHART HASIL BELAJAR
===================================================== */

function drawResultChart(benar,salah){

    const ctx =
        document.getElementById('resultChart');

    if(resultChart){

        resultChart.destroy();

    }

    resultChart = new Chart(ctx,{

        type:'doughnut',

        data:{

            labels:['Benar','Salah'],

            datasets:[{

    data:[benar,salah],

    backgroundColor:[

        '#22c55e',

        '#ef4444'

    ],

    borderColor:[

        '#ffffff',

        '#ffffff'

    ],

    borderWidth:4,

    hoverOffset:12

}]

        },

        options:{

            responsive:true,
            
            maintainAspectRatio:false,

            plugins:{

                legend:{
                    display:false
                },

                title:{
                    display:true,
                    text:'Grafik Hasil Belajar'
                }

            },

            scales:{

                y:{

                    beginAtZero:true,

                    ticks:{
                        precision:0
                    }

                }

            }

        }

    });

}
$('btnSound').addEventListener('click',()=>{

    soundEnabled = !soundEnabled;

    const btn = $('btnSound');

    if(soundEnabled){

        btn.textContent = "🔊";

        btn.classList.remove("off");

    }else{

        btn.textContent = "🔇";

        btn.classList.add("off");

    }

});
/* =====================================================
   FORMAT NAMA OTOMATIS
===================================================== */

$('inputNama').addEventListener('input', function () {

    let nama = this.value;

    // Hanya boleh huruf, spasi, titik, dan apostrof
    nama = nama.replace(/[^a-zA-ZÀ-ÿ\s'.]/g, '');

    // Hapus spasi ganda
    nama = nama.replace(/\s+/g, ' ');

    // Hapus spasi di awal
    nama = nama.trimStart();

    // Huruf kecil semua
    nama = nama.toLowerCase();

    // Kapital setiap awal kata
    nama = nama.replace(/\b\w/g, huruf => huruf.toUpperCase());

    this.value = nama;

});