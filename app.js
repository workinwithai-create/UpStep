"use strict";
(() => {
  // src/lib/upstep/score.ts
  var SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  var FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
  function pcOf(n) {
    return (n % 12 + 12) % 12;
  }
  function useFlats(tonicPc) {
    return [3, 5, 8, 10].includes(pcOf(tonicPc));
  }
  function spell(pc, flats) {
    return (flats ? FLAT : SHARP)[pcOf(pc)];
  }
  var songs = [
    {
      id: "porch",
      name: "Porch Key",
      bpm: 98,
      mode: "maj",
      tonicPc: 0,
      feel: "Straight pop",
      progression: [
        { pc: 0, q: "maj" },
        { pc: 7, q: "maj" },
        { pc: 9, q: "min" },
        { pc: 5, q: "maj" }
      ]
    },
    {
      id: "night",
      name: "Night Bus",
      bpm: 92,
      mode: "min",
      tonicPc: 9,
      feel: "Night drive",
      progression: [
        { pc: 9, q: "min" },
        { pc: 5, q: "maj" },
        { pc: 0, q: "maj" },
        { pc: 7, q: "maj" }
      ]
    },
    {
      id: "lamp",
      name: "Lamp Room",
      bpm: 80,
      mode: "maj",
      tonicPc: 7,
      feel: "Ballad",
      progression: [
        { pc: 7, q: "maj" },
        { pc: 4, q: "min" },
        { pc: 0, q: "maj" },
        { pc: 2, q: "maj" }
      ]
    }
  ];
  var recipes = [
    {
      id: "truck",
      name: "Truck driver",
      semis: 2,
      pivot: "V",
      blurb: "Two bars of the new dominant. Whole step up. The oldest pop finish, played live."
    },
    {
      id: "half",
      name: "Half step",
      semis: 1,
      pivot: "V",
      blurb: "One fret. Smaller than it feels. The trumpet still has to find the leading tone."
    },
    {
      id: "gospel",
      name: "Gospel third",
      semis: 3,
      pivot: "V",
      blurb: "A minor third. The choir lift, without a choir \u2014 violin takes the new third."
    },
    {
      id: "pivot",
      name: "ii\u2013V pivot",
      semis: 2,
      pivot: "ii-V",
      blurb: "A real cadence into the new key. Two bars, then the hook lands higher."
    }
  ];
  function near(midi, center) {
    const delta = midi - center;
    const wrapped = delta - Math.round(delta / 12) * 12;
    return center + wrapped;
  }
  function chordOf(rootPc, q, flats = false) {
    const pc = pcOf(rootPc);
    const third = q === "min" ? 3 : 4;
    let bass = 36 + pc;
    if (bass > 43) bass -= 12;
    const p = 48 + pc;
    const low = near(p, 52);
    return {
      symbol: spell(pc, flats) + (q === "min" ? "m" : ""),
      bass,
      piano: [low, low + third, low + 7, low + 12],
      guitar: [near(p, 48), near(p + 7, 52), near(p + 12, 55)]
    };
  }
  function keyName(tonicPc, mode2) {
    return `${spell(tonicPc, useFlats(tonicPc))} ${mode2 === "min" ? "minor" : "major"}`;
  }
  function intervalLabel(semis) {
    if (semis === 1) return "half step";
    if (semis === 2) return "whole step";
    if (semis === 3) return "minor third";
    return `${semis} semitones`;
  }
  function rests() {
    return Array.from({ length: 16 }, () => 0);
  }
  function trumpetLine(chord, degree) {
    const root = chord.piano[0];
    const third = chord.piano[1];
    const fifth = chord.piano[2];
    const target = degree === "root" ? root : degree === "third" ? third : fifth;
    const line = rests();
    line[0] = near(target + 12, 64);
    return line;
  }
  function buildScore(song2, recipe2) {
    const newTonic = pcOf(song2.tonicPc + recipe2.semis);
    const homeFlats = useFlats(song2.tonicPc);
    const liftFlats = useFlats(newTonic);
    const home = song2.progression.map((c) => chordOf(c.pc, c.q, homeFlats));
    const lift = song2.progression.map((c) => chordOf(c.pc + recipe2.semis, c.q, liftFlats));
    const v = chordOf(newTonic + 7, "maj", liftFlats);
    const ii = chordOf(newTonic + 2, "min", liftFlats);
    const pivotChords = recipe2.pivot === "ii-V" ? [ii, v] : [v, v];
    const bars = [];
    home.forEach((chord) => {
      bars.push({ chord, role: "home", trumpet: rests(), violin: null, crash: false });
    });
    pivotChords.forEach((chord, i) => {
      const degree = recipe2.pivot === "ii-V" ? i === 0 ? "fifth" : "third" : i === 0 ? "fifth" : "third";
      bars.push({
        chord,
        role: "pivot",
        trumpet: trumpetLine(chord, degree),
        violin: null,
        crash: false
      });
    });
    lift.forEach((chord, i) => {
      const third = near(chord.piano[1] + 12, 67);
      bars.push({
        chord,
        role: "lift",
        trumpet: i === 0 ? trumpetLine(chord, "root") : rests(),
        violin: third,
        crash: i === 0
      });
    });
    return {
      bars,
      fromKey: keyName(song2.tonicPc, song2.mode),
      toKey: keyName(newTonic, song2.mode),
      interval: intervalLabel(recipe2.semis)
    };
  }
  function sliceFor(score2, mode2) {
    if (mode2 === "home") return { bars: score2.bars.slice(0, 4), origin: 0 };
    if (mode2 === "step") return { bars: score2.bars.slice(4), origin: 4 };
    return { bars: score2.bars, origin: 0 };
  }
  function punchList(song2, recipe2, score2) {
    const home = score2.bars.slice(0, 4);
    const pivot = score2.bars.slice(4, 6);
    const lift = score2.bars.slice(6);
    const line = (bars, start) => bars.map((b, i) => `  ${start + i}. ${b.chord.symbol}`).join("\n");
    return [
      "UpStep punch list",
      `${song2.name} \xB7 ${song2.bpm} BPM \xB7 ${score2.fromKey} \u2192 ${score2.toKey} \xB7 ${recipe2.name} (+${recipe2.semis})`,
      "",
      "The problem: the last chorus is the same chorus. The song ends where it started.",
      `The move: ${recipe2.blurb}`,
      "",
      `Chorus (bars 1\u20134) \xB7 ${score2.fromKey}`,
      line(home, 1),
      "",
      `Pivot (bars 5\u20136) \xB7 trumpet climbs`,
      line(pivot, 5),
      "",
      `Last chorus (bars 7\u201310) \xB7 ${score2.toKey}`,
      line(lift, 7),
      "",
      "Live chairs only \u2014 FluidR3 piano, upright bass, guitar, trumpet, violin, and kit.",
      "No synths. Drop the recording on the pivot and the lifted chorus.",
      "Do not copy-paste chorus one. Not a hold, not a coda, not a pre-chorus."
    ].join("\n");
  }

  // src/lib/upstep/engine.ts
  var CDN = "https://cdn.jsdelivr.net/gh/workinwithai-create/PreEight@main/public/samples";
  var FILES = [
    { id: "kick", url: `${CDN}/drums/kick.mp3`, midi: 0, group: "drum" },
    { id: "snare", url: `${CDN}/drums/snare.mp3`, midi: 0, group: "drum" },
    { id: "hat", url: `${CDN}/drums/hihat.mp3`, midi: 0, group: "drum" },
    { id: "crash", url: `${CDN}/drums/crash.mp3`, midi: 0, group: "drum" },
    { id: "pC3", url: `${CDN}/piano/C3.mp3`, midi: 48, group: "piano" },
    { id: "pA3", url: `${CDN}/piano/A3.mp3`, midi: 57, group: "piano" },
    { id: "pC4", url: `${CDN}/piano/C4.mp3`, midi: 60, group: "piano" },
    { id: "bE1", url: `${CDN}/bass/E1.mp3`, midi: 28, group: "bass" },
    { id: "bA1", url: `${CDN}/bass/A1.mp3`, midi: 33, group: "bass" },
    { id: "bC2", url: `${CDN}/bass/C2.mp3`, midi: 36, group: "bass" },
    { id: "gE2", url: `${CDN}/guitar/E2.mp3`, midi: 40, group: "guitar" },
    { id: "gA2", url: `${CDN}/guitar/A2.mp3`, midi: 45, group: "guitar" },
    { id: "gE3", url: `${CDN}/guitar/E3.mp3`, midi: 52, group: "guitar" },
    { id: "tC4", url: `${CDN}/trumpet/C4.mp3`, midi: 60, group: "trumpet" },
    { id: "vA3", url: `${CDN}/violin/A3.mp3`, midi: 57, group: "violin" }
  ];
  function rate(midi, base) {
    return 2 ** ((midi - base) / 12);
  }
  var DeskEngine = class {
    constructor(onStatus) {
      this.onStatus = onStatus;
    }
    onStatus;
    ctx = null;
    bus = null;
    voices = {};
    drums = {};
    timer = null;
    playing = false;
    ready = false;
    async resume() {
      if (!this.ctx) await this.load();
      if (this.ctx && this.ctx.state === "suspended") await this.ctx.resume();
    }
    async load() {
      const ctx = new AudioContext();
      this.ctx = ctx;
      const bus = ctx.createGain();
      bus.gain.value = 0.9;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.knee.value = 10;
      comp.ratio.value = 2.2;
      comp.attack.value = 8e-3;
      comp.release.value = 0.18;
      const delay = ctx.createDelay();
      delay.delayTime.value = 0.037;
      const fb = ctx.createGain();
      fb.gain.value = 0.16;
      const wet = ctx.createGain();
      wet.gain.value = 0.1;
      bus.connect(comp);
      bus.connect(delay);
      delay.connect(fb);
      fb.connect(delay);
      delay.connect(wet);
      wet.connect(comp);
      comp.connect(ctx.destination);
      this.bus = bus;
      let n = 0;
      for (const file of FILES) {
        this.onStatus(`Seating live chairs ${n}/${FILES.length}`);
        const res = await fetch(file.url);
        if (!res.ok) throw new Error(`Missing live sample ${file.id}`);
        const buffer = await ctx.decodeAudioData(await res.arrayBuffer());
        if (file.group === "drum") this.drums[file.id] = buffer;
        else {
          if (!this.voices[file.group]) this.voices[file.group] = [];
          this.voices[file.group].push({ buffer, midi: file.midi });
        }
        n += 1;
        this.onStatus(`Seating live chairs ${n}/${FILES.length}`);
      }
      this.ready = true;
      this.onStatus("Live FluidR3 chairs seated \u2014 piano, upright, guitar, trumpet, violin, kit");
    }
    playDrum(name, when, gain, dur = 0.4) {
      const buffer = this.drums[name];
      if (!buffer || !this.ctx || !this.bus) return;
      this.fire(buffer, 1, when, gain, dur);
    }
    playGroup(group, midi, when, gain, dur) {
      const list = this.voices[group];
      if (!list?.length || midi <= 0) return;
      let best = list[0];
      let bestDist = Math.abs(Math.log(rate(midi, best.midi)));
      for (const v of list) {
        const d = Math.abs(Math.log(rate(midi, v.midi)));
        if (d < bestDist) {
          best = v;
          bestDist = d;
        }
      }
      const r = rate(midi, best.midi);
      if (r < 0.55 || r > 1.95) return;
      this.fire(best.buffer, r, when, gain, dur);
    }
    fire(buffer, playback, when, gain, dur) {
      if (!this.ctx || !this.bus) return;
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = playback;
      const g = this.ctx.createGain();
      const end = when + Math.max(0.08, dur);
      g.gain.setValueAtTime(1e-4, when);
      g.gain.exponentialRampToValueAtTime(Math.max(1e-3, gain), when + 0.018);
      g.gain.setValueAtTime(Math.max(1e-3, gain), Math.max(when + 0.03, end - 0.06));
      g.gain.exponentialRampToValueAtTime(1e-4, end);
      src.connect(g);
      g.connect(this.bus);
      src.start(when);
      src.stop(end + 0.02);
    }
    scheduleBar(bar, t0, step) {
      const at = (s) => t0 + s * step;
      const pivot = bar.role === "pivot";
      const lift = bar.role === "lift";
      for (let s = 0; s < 16; s += 2) {
        const swell = pivot ? 0.03 + s / 16 * 0.045 : lift ? 0.07 : 0.055;
        this.playDrum("hat", at(s), swell, step * 1.6);
      }
      if (pivot) {
        this.playDrum("kick", at(0), 0.42, 0.3);
        this.playDrum("snare", at(8), 0.22, 0.25);
        this.playDrum("snare", at(12), 0.28, 0.2);
        this.playDrum("snare", at(14), 0.36, 0.18);
      } else {
        this.playDrum("kick", at(0), 0.72, 0.35);
        this.playDrum("snare", at(4), 0.38, 0.22);
        this.playDrum("kick", at(8), 0.55, 0.3);
        this.playDrum("snare", at(12), 0.4, 0.22);
      }
      if (bar.crash) this.playDrum("crash", at(0), 0.34, 1.4);
      const chordDur = pivot ? step * 15 : step * 7.5;
      bar.chord.piano.forEach((n, i) => {
        this.playGroup("piano", n, at(0), 0.22 - i * 0.03, chordDur);
      });
      if (!pivot) {
        bar.chord.piano.slice(1, 3).forEach((n) => {
          this.playGroup("piano", n, at(6), 0.08, step * 2);
          this.playGroup("piano", n, at(14), 0.07, step * 1.5);
        });
      }
      this.playGroup("bass", bar.chord.bass, at(0), pivot ? 0.55 : 0.62, pivot ? step * 14 : step * 6);
      if (!pivot) {
        this.playGroup("bass", bar.chord.bass + 7, at(8), 0.48, step * 6);
      } else {
        this.playGroup("bass", bar.chord.bass, at(8), 0.4, step * 7);
      }
      if (!pivot) {
        bar.chord.guitar.forEach((n, i) => {
          this.playGroup("guitar", n, at(4), 0.16 - i * 0.03, step * 2.2);
          this.playGroup("guitar", n, at(12), 0.14 - i * 0.02, step * 2);
        });
      }
      bar.trumpet.forEach((n, s) => {
        if (n > 0) this.playGroup("trumpet", n, at(s), 0.3, pivot ? step * 14 : step * 10);
      });
      if (bar.violin) this.playGroup("violin", bar.violin, at(0), 0.22, step * 15);
    }
    stop() {
      this.playing = false;
      if (this.timer) clearTimeout(this.timer);
      this.timer = null;
    }
    play(score2, mode2, bpm, onBar, onDone) {
      if (!this.ctx || !this.ready) return;
      this.stop();
      this.playing = true;
      const { bars, origin } = sliceFor(score2, mode2);
      const step = 60 / bpm / 4;
      const barDur = step * 16;
      let next = this.ctx.currentTime + 0.08;
      let i = 0;
      const tick = () => {
        if (!this.playing || !this.ctx) return;
        const horizon = this.ctx.currentTime + 0.25;
        while (i < bars.length && next < horizon) {
          this.scheduleBar(bars[i], next, step);
          const index = origin + i;
          const when = next;
          window.setTimeout(() => {
            if (this.playing) onBar(index);
          }, Math.max(0, (when - this.ctx.currentTime) * 1e3));
          next += barDur;
          i += 1;
        }
        if (i >= bars.length && this.ctx.currentTime > next - barDur * 0.15) {
          this.playing = false;
          onDone();
          return;
        }
        this.timer = setTimeout(tick, 60);
      };
      tick();
    }
    dispose() {
      this.stop();
      void this.ctx?.close();
      this.ctx = null;
    }
  };

  // ship/main.ts
  var ROLE = { home: "Chorus", pivot: "Pivot", lift: "Up" };
  var song = songs[0];
  var recipe = recipes[0];
  var mode = null;
  var engine = new DeskEngine((s) => {
    const el = document.getElementById("status");
    if (el) el.textContent = s;
  });
  function score() {
    return buildScore(song, recipe);
  }
  function stop() {
    engine.stop();
    mode = null;
    paintBars();
  }
  async function play(next) {
    await engine.resume();
    mode = next;
    const current = score();
    engine.play(
      current,
      next,
      song.bpm,
      (index) => {
        mode = next;
        paintBars(index);
      },
      () => {
        mode = null;
        paintBars();
      }
    );
    paintBars();
  }
  function paintSongs() {
    const root = document.getElementById("songs");
    if (!root) return;
    root.innerHTML = "";
    for (const item of songs) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "card" + (item.id === song.id ? " on" : "");
      b.innerHTML = `<b>${item.name}</b><span>${item.bpm} BPM \xB7 ${item.feel}</span>`;
      b.onclick = () => {
        stop();
        song = item;
        render();
      };
      root.appendChild(b);
    }
  }
  function paintRecipes() {
    const root = document.getElementById("recipes");
    if (!root) return;
    root.innerHTML = "";
    for (const item of recipes) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "card" + (item.id === recipe.id ? " on" : "");
      b.innerHTML = `<b>${item.name} <em>+${item.semis}</em></b><span>${item.blurb}</span>`;
      b.onclick = () => {
        stop();
        recipe = item;
        render();
      };
      root.appendChild(b);
    }
  }
  function paintBars(active = -1) {
    const root = document.getElementById("bars");
    const sc = score();
    if (!root) return;
    root.innerHTML = "";
    sc.bars.forEach((cell, i) => {
      const li = document.createElement("li");
      li.className = "bar " + cell.role + (active === i ? " active" : "");
      li.innerHTML = `<span>${i + 1} \xB7 ${ROLE[cell.role]}</span><strong>${cell.chord.symbol}</strong>`;
      root.appendChild(li);
    });
    const badge = document.getElementById("badge");
    if (badge) badge.textContent = `${sc.fromKey} \u2192 ${sc.toKey}`;
    const punch = document.getElementById("punch");
    if (punch) punch.textContent = punchList(song, recipe, sc);
  }
  function render() {
    paintSongs();
    paintRecipes();
    paintBars();
    try {
      localStorage.setItem("upstep-v1", JSON.stringify({ songId: song.id, recipeId: recipe.id }));
    } catch {
    }
  }
  var saved = localStorage.getItem("upstep-v1");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      song = songs.find((s) => s.id === parsed.songId) ?? song;
      recipe = recipes.find((r) => r.id === parsed.recipeId) ?? recipe;
    } catch {
    }
  }
  document.getElementById("play-home")?.addEventListener("click", () => void play("home"));
  document.getElementById("play-step")?.addEventListener("click", () => void play("step"));
  document.getElementById("play-hand")?.addEventListener("click", () => void play("handoff"));
  document.getElementById("stop")?.addEventListener("click", stop);
  document.getElementById("copy")?.addEventListener("click", async () => {
    const text = document.getElementById("punch")?.textContent ?? "";
    try {
      await navigator.clipboard.writeText(text);
      const btn = document.getElementById("copy");
      if (btn) btn.textContent = "Copied";
    } catch {
    }
  });
  window.addEventListener("keydown", (e) => {
    if (e.code !== "Space" || e.repeat) return;
    e.preventDefault();
    if (mode) stop();
    else void play("handoff");
  });
  render();
})();
