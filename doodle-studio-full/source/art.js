// =====================================================================
//  BUILT-IN PIXEL ART + EXAMPLE GAMES
// =====================================================================
const PAL = { K:'#1b1b2f', R:'#e94560', S:'#ffcc99', B:'#3867d6', W:'#ffffff', Y:'#ffd32a', O:'#ff9f1a', G:'#2ecc71', D:'#1e8449',
  C:'#7ed6df', P:'#a55eea', g:'#8395a7', d:'#576574', l:'#c8d6e5', r:'#ff6b6b', b:'#222f3e', w:'#dfe6e9' };
function pixelArt(rows) {
  const h = rows.length, w = rows[0].length, c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  rows.forEach((row, j) => [...row].forEach((ch, i) => { if (PAL[ch]) { x.fillStyle = PAL[ch]; x.fillRect(i, j, 1, 1); } }));
  return c.toDataURL();
}
function starfield(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0b1026'); g.addColorStop(1, '#2b1055');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 160; i++) { x.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.7})`; const s = Math.random() < 0.1 ? 2 : 1; x.fillRect(Math.random() * w | 0, Math.random() * h | 0, s, s); }
  return c.toDataURL();
}
function skyHills(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#74b9ff'); g.addColorStop(1, '#dff9fb');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.fillStyle = 'rgba(255,255,255,.85)';
  [[80, 70], [330, 50], [520, 90]].forEach(([cx, cy]) => { [0, 22, 44].forEach(dx => { x.beginPath(); x.arc(cx + dx, cy + (dx === 22 ? -10 : 0), 22, 0, 7); x.fill(); }); });
  x.fillStyle = '#a3d9a5';
  x.beginPath(); x.moveTo(0, h); for (let i = 0; i <= w; i += 10) x.lineTo(i, h - 90 - Math.sin(i / 70) * 30); x.lineTo(w, h); x.fill();
  return c.toDataURL();
}
function gardenNight(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1b2b3a'); g.addColorStop(1, '#2d4a2b');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.fillStyle = '#f5f3ce'; x.beginPath(); x.arc(w - 80, 60, 26, 0, 7); x.fill();
  for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(${90 + Math.random() * 60},${140 + Math.random() * 60},${70 + Math.random() * 40},.5)`; x.fillRect(Math.random() * w, h * 0.35 + Math.random() * h * 0.65, 2, 4); }
  x.fillStyle = '#16241a';
  [[60, 0.45], [w * 0.4, 0.4], [w * 0.75, 0.5]].forEach(([tx, k]) => { x.beginPath(); x.moveTo(tx - 40, h * k + 60); x.lineTo(tx, h * k - 70); x.lineTo(tx + 40, h * k + 60); x.fill(); x.fillRect(tx - 6, h * k + 60, 12, 24); });
  return c.toDataURL();
}
const ART = {
  hero: [
    '...KKKKKK...',
    '..KRRRRRRK..',
    '.KRRRRRRRRK.',
    '.KKKSSSSKKK.',
    '.KSSKSSKSSK.',
    '.KSSSSSSSSK.',
    '..KSSKKSSK..',
    '..KBBBBBBK..',
    '.KSBBYYBBSK.',
    '.KSBBBBBBSK.',
    '..KBBKKBBK..',
    '..KBBK.KBBK.',
    '..KKKK.KKKK.',
  ],
  hero2: [
    '...KKKKKK...',
    '..KRRRRRRK..',
    '.KRRRRRRRRK.',
    '.KKKSSSSKKK.',
    '.KSSKSSKSSK.',
    '.KSSSSSSSSK.',
    '..KSSKKSSK..',
    '..KBBBBBBK..',
    '.KSBBYYBBSK.',
    '.KSBBBBBBSK.',
    '..KBBKKBBK..',
    '.KBBK..KBBK.',
    '.KKKK...KKK.',
  ],
  coin: [
    '..KKKK..',
    '.KYYYYK.',
    'KYYWYYOK',
    'KYWYYYOK',
    'KYYYYYOK',
    'KYYYYOOK',
    '.KYOOOK.',
    '..KKKK..',
  ],
  slime: [
    '...KKKK...',
    '..KGGGGK..',
    '.KGGWGGGK.',
    '.KGWKGWKGK',
    'KGGGGGGGGK',
    'KGGGDDGGGK',
    'KDGGGGGGDK',
    '.KKKKKKKK.',
  ],
  ship: [
    '.....K.....',
    '....KWK....',
    '....KCK....',
    '...KWCWK...',
    '...KWWWK...',
    '..KWWBWWK..',
    '.KRWBBBWRK.',
    'KRRWWWWWRRK',
    'KRKWKKKWKRK',
    'K..KOKOK..K',
    '....O.O....',
  ],
  rock: [
    '...KKKK...',
    '..KgggdK..',
    '.KglggddK.',
    'KgllgggddK',
    'KgggggdgdK',
    'KggdggggdK',
    'KgggggddK.',
    '.KgdggdK..',
    '..KKKKK...',
  ],
  flag: [
    'KRRRRR..',
    'KRRWRRR.',
    'KRRRRR..',
    'K.......',
    'K.......',
    'K.......',
    'K.......',
    'K.......',
  ],
  ghost: [
    '...KKKK...',
    '..KWWWWK..',
    '.KWWWWWWK.',
    'KWWKWWKWWK',
    'KWWKWWKWWK',
    'KWWWWWWWWK',
    'KWWWrrWWWK',
    'KWWWWWWWWK',
    'KWWKWWKWWK',
    'KK.KK.KK.K',
  ],
  gem: [
    '..KKKK..',
    '.KPCCPK.',
    'KPCWCCPK',
    'KPPCCPPK',
    '.KPPPPK.',
    '..KPPK..',
    '...KK...',
  ],
  heart: [
    '.KK.KK.',
    'KrrKrrK',
    'KrWrrrK',
    'KrrrrrK',
    '.KrrrK.',
    '..KrK..',
    '...K...',
  ],
};
let _builtin = null;
function builtinCostumes() {
  if (_builtin) return _builtin;
  _builtin = {};
  for (const k in ART) _builtin[k] = pixelArt(ART[k]);
  return _builtin;
}
const pickArt = (...names) => { const b = builtinCostumes(), o = {}; names.forEach(n => o[n] = b[n]); return o; };
const ob = (name, kind, x, y, w, h, color, extra = {}) => ({ name, kind, x, y, w, h, color, text:'', visible:1, angle:0, alpha:1, physics:0, solid:0, flip:0, hud:0, costume:'', ...extra });

// ---------------- example games ----------------
const COIN_CATCHER = `~ ⭐ Coin Catcher!  Press Play, then use the arrow keys.
score = 0
speed = 5

when start
  say "Game started! Catch the stars."
done

forever
  ~ move with the arrow keys
  if held(left) -> @player.x -= speed
  if held(right) -> @player.x += speed
  if held(up) -> @player.y -= speed
  if held(down) -> @player.y += speed
  fence @player

  ~ the star spins and changes color
  @coin.angle += 3
  @coin.color = hsl(frame * 3, 90, 55)

  ~ catch it!
  if @player touches @coin
    score += 1
    sparkle @coin.cx, @coin.cy, 30, gold
    play "coin"
    place @coin, dice(20, stage.w - 60), dice(60, stage.h - 120)
  done

  @scoreText.text = "Score: " + score
done

~ space makes you faster
when key space
  speed += 2
  play "powerup"
  say "Faster! speed is now " + speed
done
`;

const PLATFORMER = `~ 🍄 Platform Jumper — arrows to move, up to jump!
score = 0
gravity 0.7

when start
  ~ make a row of coins from the @coin template
  loop 6 as i
    copy @coin as c
    place @c, 110 + i * 80, 140 + (i % 2) * 70
  done
  hide @coin
done

forever
  @hero.vx = 0
  if held(left)
    @hero.vx = -4
    @hero.flip = yes
  done
  if held(right)
    @hero.vx = 4
    @hero.flip = no
  done
  if held(up) and @hero.onground
    @hero.vy = -13
    play "jump"
  done

  ~ walking animation: swap costumes while moving
  if @hero.vx isnt 0 and floor(frame / 8) % 2 is 0
    @hero.costume = "hero2"
  otherwise
    @hero.costume = "hero"
  done

  ~ collect coins
  loop each c in clones(@coin)
    @c.y += sin(frame * 4 + @c.x) * 0.4
    if @hero touches @c
      score += 1
      sparkle @c.cx, @c.cy, 25, gold
      play "coin"
      erase @c
    done
  done

  ~ the slime walks back and forth
  @slime.x += sin(frame * 2) * 2
  if @hero touches @slime or @hero.y > stage.h
    place @hero, 30, 200
    shake 10
    flash red
    play "hit"
  done

  @scoreLabel.text = "Coins: " + score + " / 6"
  if size(clones(@coin)) is 0
    pin on
    letters 44, "Arial", bold
    align center
    ink white
    glow 10, black
    write stage.w / 2, 130, "You win! 🎉"
  done
done
`;

const SHOOTER = `~ 🚀 Space Shooter — left/right to move, space to fire!
score = 0
lives = 3
best = load("best", 0)
hide @laser
hide @rock

forever
  if held(left) -> @ship.x -= 6
  if held(right) -> @ship.x += 6
  fence @ship

  loop each r in clones(@rock)
    @r.angle += 3
    if @ship touches @r
      pop @r
      lives -= 1
      shake 12
      flash red
      play "hit"
    but if @r.y > stage.h
      erase @r
    done
  done

  loop each l in clones(@laser)
    hit = @l touches @rock
    if hit
      pop @hit
      erase @l
      score += 10
      play "explode"
    but if @l.y < -20
      erase @l
    done
  done

  if lives <= 0
    if score > best
      best = score
      save "best", best
    done
    pin on
    letters 52, "Arial", bold
    align center
    ink white
    glow 12, #ff4d8d
    write stage.w / 2, stage.h / 2 - 40, "GAME OVER"
    play "lose"
    stop
  done

  pin on
  ink white
  letters 18, "Arial", bold
  write 12, 10, "Score: " + score + "    Lives: " + lives + "    Best: " + best
done

when key space
  copy @laser as l
  place @l, @ship.cx - @l.w / 2, @ship.y - 10
  @l.vy = -10
  play "laser"
done

every 0.7s
  copy @rock as r
  place @r, dice(0, stage.w - @r.w), -60
  @r.vy = rand(2, 5)
done
`;

const FIREWORKS = `~ 🎆 Fireworks — click anywhere! Press space for a big show.
wash #0b1026
hue = 0

forever
  hue += 2
  pin on
  ink white
  fade 0.8
  letters 18, "Arial", bold
  align center
  write stage.w / 2, 16, "Click anywhere for fireworks ✨  Press space for a big one!"
done

when click
  sparkle mouse.x, mouse.y, 90, hsl(hue, 90, 60), 6
  play "bloop"
done

when key space
  loop 6
    sparkle rand(60, stage.w - 60), rand(60, stage.h - 120), 70, rainbow, 7
  done
  play "explode"
  shake 8
done

every 0.4s
  sparkle rand(0, stage.w), stage.h, 12, hsl(hue + 120, 90, 60), 4
done
`;

const ART_DEMO = `~ 🎨 Art with code — no game, just drawing!
paper 600, 400, #fdf6e3

~ a gradient card with rounded corners
ink none
blend #ff9a9e, #a18cd1
glow 20, rgba(0, 0, 0, 0.25)
roundbox 30, 30, 540, 340, 30
glow none

~ a ring of see-through circles
fade 0.75
loop 12 as i
  paint hsl(i * 30, 85, 62)
  circle 300 + cos(i * 30) * 110, 195 + sin(i * 30) * 110, 42
done
fade 1

~ a star in the middle with a white outline
paint #ffd32a
ink white
brush 4
star 300, 195, 62, 8

~ a little sun in the corner
ink none
paint #ffeaa7
circle 520, 80, 30
ink #ffeaa7
brush 3
loop 8 as i
  line 520 + cos(i * 45) * 38, 80 + sin(i * 45) * 38, 520 + cos(i * 45) * 50, 80 + sin(i * 45) * 50
done

~ the title
ink white
letters 30, "Georgia", bold
align center
glow 8, rgba(0, 0, 0, 0.35)
write 300, 322, "Made with Doodle"
`;

const BOUNCE = `~ ⚽ Bouncy balls — click to add more!
colors = [#ff6b6b, #feca57, #48dbfb, #1dd1a1, #a55eea]
hide @ball

~ teach Doodle a brand-new command
teach addball bx, by
  copy @ball as b
  place @b, bx, by
  @b.vx = rand(-5, 5)
  @b.vy = rand(-6, 2)
  @b.color = pick(colors)
done

when start
  loop 8 -> addball rand(50, stage.w - 50), rand(50, 200)
done

when click
  addball mouse.x, mouse.y
  play "bloop"
done

forever
  loop each b in clones(@ball)
    @b.vy += 0.3
    bounce @b
  done
  pin on
  ink white
  letters 18, "Arial", bold
  write 12, 10, "Balls: " + size(clones(@ball)) + "   (click to add more)"
done
`;

const HAUNTED = `~ 🏚️ Haunted Garden — collect 5 gems before the ghosts get you!
~ Shows off: scenes, buttons, darkness & lights, rain, music, speech bubbles, chasing ghosts, health bars.
health = 3
gems = 0

when start -> go "menu"

~ ---------- the title screen ----------
when go menu
  music "chill"
  weather "leaves"
  hide @hero
done

during menu
  pin on
  align center
  ink white
  letters 46, "Georgia", bold
  glow 18, #8b5cf6
  write stage.cx, 90, "Haunted Garden"
  glow none
  letters 18, "Arial"
  write stage.cx, 150, "Collect 5 gems. Don't let the ghosts catch you!"
  paint #8b5cf6
  if button("▶  Play", stage.cx - 70, 220, 140) or pressed(space) -> go "play"
done

~ ---------- the game ----------
when go play
  music "spooky"
  weather "rain"
  dark 0.8
  show @hero
  place @hero, 60, 300
  light @hero, 150
  talk @hero, "It's so dark in here...", 2.5
  loop 3 as i
    copy @ghost as g
    place @g, 420 + i * 50, 40 + i * 100
    chase @g, @hero, 0.7 + i * 0.25
  done
  loop 5 as i
    copy @gem as m
    place @m, dice(40, stage.w - 60), dice(40, stage.h - 60)
    light @m, 45
  done
done

during play
  if held(left) -> @hero.x -= 3
  if held(right) -> @hero.x += 3
  if held(up) -> @hero.y -= 3
  if held(down) -> @hero.y += 3
  fence @hero

  found = @hero touches @gem
  if found
    pop @found
    gems += 1
    play "coinbig"
    talk @hero, "{gems} / 5!", 1
  done

  hit = @hero touches @ghost
  if hit
    health -= 1
    shake 12
    flash red
    play "hit"
    place @hit, dice(300, 560), 20
  done

  ~ health bar and gem counter, pinned to the screen
  pin on
  bar 12, 12, 150, 16, health, 3, #ff4d8d
  ink white
  letters 16, "Arial", bold
  write 175, 11, "Gems: {gems}/5    ⏱ {clock(scene.time)}"

  if gems >= 5 -> go "win"
  if health <= 0 -> go "lose"
done

~ ---------- the endings ----------
when go win
  dark 0
  weather "confetti"
  music "victory"
  loop each g in clones(@ghost) -> pop @g
  talk @hero, "I'm free!", 3
done

when go lose
  music none
  weather none
  play "lose"
  dark 0.6
done

during win
  pin on
  align center
  ink white
  glow 12, black
  letters 48, "Arial", bold
  write stage.cx, 110, "You escaped! 🎉"
  letters 20, "Arial"
  write stage.cx, 170, "Time: {clock(scene.time)}"
  paint #22c55e
  if button("Play again", stage.cx - 80, 230, 160) -> restart
done

during lose
  pin on
  align center
  ink white
  glow 12, black
  letters 48, "Arial", bold
  write stage.cx, 120, "The ghosts got you! 👻"
  paint #ff4d8d
  if button("Try again", stage.cx - 75, 220, 150) -> restart
done
`;

const MAZE = `~ 🧩 Maze Runner — find the star! (arrow keys)
~ Shows off: levels built from text, pick-your-keys controls, wait, records, and teach.
level = [
  "####################",
  "#P   #     #      o#",
  "# ## # ### # #### ##",
  "#  #   # #   #     #",
  "## ##### ##### ### #",
  "#o     #     #   # #",
  "# ### ### ## # # # #",
  "#   #     #    #   #",
  "### ##### ###### ###",
  "#o      #         *#",
  "####################"
]
tile "#", @wall
tile "o", @coin
tile "P", @hero, once
tile "*", @goal, once
build level, 30

player = { coins: 0, best: load("maze-best", 999) }
won = no

when start
  talk @hero, "Find the star!", 2
done

forever
  found = @hero touches @coin
  if found
    pop @found
    player.coins += 1
    play "coin"
  done
  @goal.angle += 2

  if @hero touches @goal and not won
    won = yes
    finish
  done

  pin on
  ink white
  letters 16, "Arial", bold
  write 10, 342, "🪙 {player.coins}    ⏱ {clock(time)}    🏆 best: {player.best} s"
done

~ a little cutscene, using wait
teach finish
  controls @hero, none
  play "win"
  weather "confetti"
  talk @hero, "I did it!", 2
  wait 2s
  t = round(time)
  if t < player.best
    player.best = t
    save "maze-best", t
    talk @hero, "New record: {t} seconds!", 3
  otherwise
    talk @hero, "{t} seconds. Try to beat {player.best}!", 3
  done
  wait 3s
  restart
done
`;

const GEM_QUEST = `~ 💎 Gem Quest — shows off new Doodle words:
~ functions in a box, send / when get, when … touches, choose, typewrite, patrol, bob, trail
gems = 0
lives = 3
points = (n -> n * 100)
spots = [[80, 80], [500, 70], [300, 190], [110, 300], [520, 300], [200, 140], [420, 150]]

loop each s in spots
  copy @gem as g
  place @g, s[0], s[1]
  bob @g, 6, 2 + dice(0, 2)
done
patrol @ghost, [[60, 240], [520, 240]], 1.5
patrol @ghost2, [[300, 30], [300, 300]], 1.2
trail @hero, gold

when start
  typewrite @label, "Collect every gem. Watch out for ghosts!", 30
  choose "How brave are you?", ["Brave: fast ghosts", "Careful: slow ghosts"], mode
  if mode is "Brave: fast ghosts"
    patrol @ghost, [[60, 240], [520, 240]], 3.5
    patrol @ghost2, [[300, 30], [300, 300]], 3
  done
  controls @hero, "arrows", 3.5
done

~ "it" is the gem copy we touched
when @hero touches @gem
  gems += 1
  sparkle @it.cx, @it.cy, 30, gold
  play "coin"
  erase @it
  send "gem"
done

when get "gem"
  left = count(@gem)
  if left is 0
    send "win"
  otherwise
    typewrite @label, "{left} gems left!", 40, "quiet"
  done
done

when @hero touches @ghost -> send "ouch"
when @hero touches @ghost2 -> send "ouch"

when get "ouch"
  lives -= 1
  shake 8
  flash red
  play "hit"
  place @hero, 30, 350
  if lives <= 0 -> send "end", "The ghosts got you!"
done

when get "win" -> send "end", "You found every gem! 🎉"

when get "end"
  calm @ghost
  calm @ghost2
  controls @hero, "none"
  if lives > 0
    weather "confetti"
    play "win"
  otherwise
    play "lose"
  done
  typewrite @label, message, 25
  wait until not typing(@label)
  wait 1s
  choose "Play again?", ["Yes!", "No thanks"], again
  if again is "Yes!" -> restart
done

forever
  hearts = copies("❤️", lives)
  pin on
  letters 18, "Arial", bold
  ink white
  glow 6, black
  write 12, stage.h - 30, "💎 {gems}    {hearts}    ⭐ {points(gems)}"
done
`;

const EXAMPLES = [
  { id:'coins', emoji:'⭐', title:'Coin Catcher', desc:'Arrow keys, touching, score, particles',
    make:() => ({ width:600, height:400, bg:'#bfe6ff', backdrop:null, costumes:{}, code:COIN_CATCHER, objects:[
      ob('ground', 'rect', 0, 350, 600, 50, '#20bf6b'),
      ob('player', 'rect', 270, 290, 60, 40, '#3867d6'),
      ob('coin', 'star', 110, 90, 44, 44, '#f7b731'),
      ob('scoreText', 'text', 16, 12, 120, 28, '#1e272e', { text:'Score: 0' }),
    ] }) },
  { id:'platformer', emoji:'🍄', title:'Platform Jumper', desc:'Painted sprites, physics, jumping, clones',
    make:() => ({ width:640, height:400, bg:'#74b9ff', backdrop:'sky', costumes:{ ...pickArt('hero', 'hero2', 'coin', 'slime'), sky:skyHills(640, 400) }, code:PLATFORMER, objects:[
      ob('ground1', 'rect', 0, 350, 260, 50, '#6ab04c', { solid:1 }),
      ob('ground2', 'rect', 330, 350, 310, 50, '#6ab04c', { solid:1 }),
      ob('ledge1', 'rect', 150, 260, 120, 18, '#b8794a', { solid:1 }),
      ob('ledge2', 'rect', 330, 200, 120, 18, '#b8794a', { solid:1 }),
      ob('ledge3', 'rect', 500, 260, 110, 18, '#b8794a', { solid:1 }),
      ob('hero', 'sprite', 30, 200, 36, 39, '', { costume:'hero', physics:1 }),
      ob('coin', 'sprite', 0, 0, 24, 24, '', { costume:'coin' }),
      ob('slime', 'sprite', 420, 320, 40, 32, '', { costume:'slime' }),
      ob('scoreLabel', 'text', 14, 12, 120, 24, '#1e272e', { text:'Coins: 0', hud:1 }),
    ] }) },
  { id:'shooter', emoji:'🚀', title:'Space Shooter', desc:'Shooting, spawning, explosions, high score',
    make:() => ({ width:600, height:420, bg:'#0b1026', backdrop:'space', costumes:{ ...pickArt('ship', 'rock'), space:starfield(600, 420) }, code:SHOOTER, objects:[
      ob('ship', 'sprite', 278, 350, 44, 44, '', { costume:'ship' }),
      ob('laser', 'rect', 0, 0, 4, 16, '#ff4d8d'),
      ob('rock', 'sprite', 0, 0, 44, 40, '#8395a7', { costume:'rock' }),
    ] }) },
  { id:'maze', emoji:'🧩', title:'Maze Runner', desc:'Levels from text, pick-your-keys controls, wait, records',
    make:() => ({ width:600, height:370, bg:'#2d3436', backdrop:null, costumes:{ ...pickArt('hero', 'coin') }, code:MAZE, objects:[
      ob('wall', 'rect', 0, 0, 30, 30, '#6c5ce7', { solid:1, visible:0 }),
      ob('coin', 'sprite', 0, 0, 16, 16, '', { costume:'coin', visible:0 }),
      ob('goal', 'star', 0, 0, 24, 24, '#ffd32a'),
      ob('hero', 'sprite', 0, 0, 20, 22, '', { costume:'hero', ctrl:'arrows', ctrlSpeed:3, ctrlStyle:'move' }),
    ] }) },
  { id:'gems', emoji:'💎', title:'Gem Quest', desc:'New! Messages, touch events, menus, typewriter, patrols, functions',
    make:() => ({ width:600, height:400, bg:'#1b2b3a', backdrop:'garden', costumes:{ ...pickArt('hero', 'ghost', 'gem'), garden:gardenNight(600, 400) }, code:GEM_QUEST, objects:[
      ob('gem', 'sprite', 0, 0, 24, 21, '', { costume:'gem', visible:0 }),
      ob('ghost', 'sprite', 60, 240, 40, 40, '', { costume:'ghost', alpha:0.85 }),
      ob('ghost2', 'sprite', 300, 30, 40, 40, '', { costume:'ghost', alpha:0.85 }),
      ob('hero', 'sprite', 30, 350, 36, 39, '', { costume:'hero' }),
      ob('label', 'text', 12, 10, 560, 30, '#ffffff', { text:'', hud:1 }),
    ] }) },
  { id:'haunted', emoji:'🏚️', title:'Haunted Garden', desc:'Scenes, buttons, darkness, rain, music, chasing ghosts',
    make:() => ({ width:600, height:400, bg:'#1b2b3a', backdrop:'garden', costumes:{ ...pickArt('hero', 'ghost', 'gem'), garden:gardenNight(600, 400) }, code:HAUNTED, objects:[
      ob('hero', 'sprite', 60, 300, 36, 39, '', { costume:'hero' }),
      ob('ghost', 'sprite', 0, 0, 40, 40, '', { costume:'ghost', visible:0, alpha:0.85 }),
      ob('gem', 'sprite', 0, 0, 24, 21, '', { costume:'gem', visible:0 }),
    ] }) },
  { id:'fireworks', emoji:'🎆', title:'Fireworks', desc:'Clicks, particles, timers, sound',
    make:() => ({ width:600, height:400, bg:'#0b1026', backdrop:null, costumes:{}, code:FIREWORKS, objects:[] }) },
  { id:'bounce', emoji:'⚽', title:'Bouncy Balls', desc:'Functions, lists, clones, bouncing',
    make:() => ({ width:600, height:400, bg:'#2d3436', backdrop:null, costumes:{}, code:BOUNCE, objects:[
      ob('ball', 'circle', 0, 0, 34, 34, '#ff6b6b'),
    ] }) },
  { id:'art', emoji:'🎨', title:'Art with Code', desc:'Gradients, transparency, shapes, text',
    make:() => ({ width:600, height:400, bg:'#fdf6e3', backdrop:null, costumes:{}, code:ART_DEMO, objects:[] }) },
  { id:'blank', emoji:'📄', title:'Empty project', desc:'A blank stage to build anything',
    make:() => ({ width:600, height:400, bg:'#ffffff', backdrop:null, costumes:{}, objects:[], code:'~ Write your game here!\n\nwhen start\n  \ndone\n\nforever\n  \ndone\n' }) },
];
