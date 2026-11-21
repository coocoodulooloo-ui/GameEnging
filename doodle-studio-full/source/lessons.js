// =====================================================================
//  🎬 LEARN — the step-by-step video lessons
// =====================================================================
const L9_OBJS = [
  ob('player', 'rect', 40, 130, 50, 40, '#3867d6'),
  ob('coin', 'star', 290, 128, 44, 44, '#f7b731'),
];
const LESSONS = [
  { title:'Your first doodle', steps:[
    { say:"Hi! Welcome to Doodle, a language made for drawing and making games. Watch the code on the left and the result on the right." },
    { say:"Every Doodle program starts with paper: how wide, how tall, and what color.", code:'paper 400, 300, lightblue' },
    { say:"paint picks the color that goes inside shapes. Think of dipping your brush.", code:'paint orange' },
    { say:"Now draw a circle. The numbers are x, y, and the size. x goes right, and y goes down.", code:'circle 200, 150, 60' },
    { say:"Lines that start with a squiggle are notes for people. Doodle skips them.", code:'~ this is my sun!' },
    { say:"Your first doodle! Press Try this code below, and change the numbers." },
  ]},
  { title:'Paint, ink and shapes', steps:[
    { say:"Doodle uses art words. paint fills the inside, ink draws the outline, and brush is how thick the outline is.", code:'paper 400, 300, white\nink black\nbrush 4' },
    { say:"box draws a rectangle: x, y, width, and height. For boxes, x and y are the top left corner.", code:'paint tomato\nbox 30, 40, 120, 80' },
    { say:"star needs x, y, a size, and how many points.", code:'paint gold\nstar 290, 90, 55, 5' },
    { say:"triangle takes three corners, two numbers each.", code:'paint mediumseagreen\ntriangle 50, 270, 130, 150, 210, 270' },
    { say:"paint none means hollow. poly makes shapes with any number of sides, here six.", code:'paint none\nink #8854d0\npoly 310, 220, 50, 6' },
  ]},
  { title:'Writing words', steps:[
    { say:"wash covers the whole paper with one color.", code:'paper 400, 300, white\nwash #2d3436' },
    { say:"letters sets the size of your words, the typeface, and you can make them bold.", code:'letters 40, "Georgia", bold' },
    { say:"For words, ink is the color of the letters.", code:'ink white' },
    { say:"write puts words at x, y. Words always go inside quote marks.", code:'write 40, 60, "Hello world!"' },
    { say:"A plus sign joins words and numbers together. Doodle does the math for you.", code:'letters 26\nink gold\nwrite 40, 160, "2 + 3 = " + (2 + 3)' },
  ]},
  { title:'Remembering things', steps:[
    { say:"A variable is a name that remembers a value. Just write the name, an equals sign, and the value.", code:'paper 400, 300, white\nsize = 30' },
    { say:"Now use the name anywhere you would use a number.", code:'paint hotpink\ncircle 70, 150, size' },
    { say:"Change it, and draw again. Now size is 30 plus 25.", code:'size = size + 25\ncircle 190, 150, size' },
    { say:"Plus equals is a shortcut for adding.", code:'size += 10\ncircle 320, 150, size' },
    { say:"Variables can remember words too.", code:'name = "Sam"\nink black\nletters 22\nwrite 20, 20, "Hi " + name + "!"' },
  ]},
  { title:'Loops', steps:[
    { say:"To do something many times, use loop. Let's set up first.", code:'paper 400, 300, #1e272e\npaint #45aaf2' },
    { say:"loop 6 as i means: do this 6 times, counting with i. So i goes 0, 1, 2, all the way to 5.", code:'loop 6 as i' },
    { say:"Use i to move each circle further right. Indenting the inside lines keeps code tidy.", code:'  circle 40 + i * 64, 150, 25' },
    { say:"done closes the loop. Every block in Doodle ends with done.", code:'done' },
    { say:"If the loop only has one command, use an arrow and skip the done! Here are 40 stars in one line.", code:'loop 40 as i -> star rand(0, 400), rand(0, 110), 7, 5' },
    { say:"They're all blue! To change the paint each time too, use a real block.", code:'loop 40 as i\n  paint hsl(i * 9, 80, 60)\n  star rand(0, 400), rand(0, 110), 7, 5\ndone' },
  ]},
  { title:'Making decisions', steps:[
    { say:"if lets your program make choices. First, roll a dice. dice 1 to 6 picks a random whole number.", code:'paper 400, 300, white\nroll = dice(1, 6)' },
    { say:"If roll is 6, run the lines inside. In Doodle you can write is, or two equals signs.", code:'letters 40, "Arial", bold\nink black\nif roll is 6' },
    { say:"This happens when it's a 6.", code:'  write 90, 120, "Jackpot! 🎉"' },
    { say:"but if checks something else, when the first check wasn't true.", code:'but if roll >= 4\n  write 110, 120, "Nice roll"' },
    { say:"otherwise means: if nothing above was true, do this. And done closes it all.", code:'otherwise\n  write 100, 120, "Roll again"\ndone' },
    { say:"Short checks fit on one line with an arrow. You can also use isnt, and, or, and not.", code:'if roll isnt 6 -> write 20, 250, "you got " + roll' },
  ]},
  { title:'Animation with forever', steps:[
    { say:"Let's make something move! First, remember where the ball is.", code:'x = 0' },
    { say:"forever runs its lines 60 times every second, on a fresh page each time.", code:'forever' },
    { say:"Each time, move the ball a little to the right.", code:'  x += 3' },
    { say:"Then draw it wherever x says.", code:'  paint tomato\n  circle x, 150, 30' },
    { say:"stage.w is how wide the stage is. When the ball goes past it, send it back.", code:'  if x > stage.w -> x = 0' },
    { say:"Close forever with done, and it's alive!", code:'done' },
  ]},
  { title:'Keyboard controls', steps:[
    { say:"Let's control something with the keyboard. Start with a position.", code:'x = 200\ny = 150' },
    { say:"held checks if a key is being held down right now.", code:'forever\n  if held(right) -> x += 3' },
    { say:"Add the left arrow too.", code:'  if held(left) -> x -= 3' },
    { say:"clamp keeps x between two numbers so it can't leave the stage. Then draw it.", code:'  x = clamp(x, 25, stage.w - 25)\n  paint #4b7bec\n  box x - 25, y - 25, 50, 50\ndone' },
    { say:"Watch. Holding the right arrow moves it right…", press:['right'] },
    { say:"…and holding the left arrow moves it back.", press:['left'] },
    { say:"when key runs once each time a key is pressed. This one plays a sound.", code:'when key space -> play "jump"' },
  ]},
  { title:'Things on the stage', stage:{ bg:'#dff9fb', objects:L9_OBJS }, steps:[
    { say:"In the Design tab, you put things on the stage with your mouse, like this blue player and this gold star." },
    { say:"In code, things on the stage start with an at sign. At player dot x is the player's x position.", code:'forever\n  @player.x += 2' },
    { say:"Change a property, and the thing changes. Here the star spins and changes color.", code:'  @coin.angle += 4\n  @coin.color = hsl(frame * 4, 90, 55)' },
    { say:"touches checks if two things are touching. pop bursts a thing into sparkles!", code:'  if @player touches @coin -> pop @coin\ndone' },
    { say:"Now the player collects the star! hide and show make things vanish and come back." },
  ]},
  { title:'Make a real game', stage:{ bg:'#dff9fb', objects:[
      ob('player', 'rect', 20, 220, 50, 40, '#3867d6'),
      ob('coin', 'star', 230, 218, 42, 42, '#f7b731'),
      ob('scoreText', 'text', 12, 10, 100, 26, '#1e272e', { text:'Score: 0' }),
    ] }, steps:[
    { say:"Let's put it all together into a real game. First, a score.", code:'score = 0' },
    { say:"Move with the arrow keys. fence keeps the player inside the stage.", code:'forever\n  if held(left) -> @player.x -= 4\n  if held(right) -> @player.x += 4\n  fence @player', press:['right'] },
    { say:"When the player touches the coin: add a point, sparkle, play a sound, and place the coin somewhere new.", code:'  if @player touches @coin\n    score += 1\n    sparkle @coin.cx, @coin.cy, 30, gold\n    play "coin"\n    place @coin, dice(0, stage.w - 40), @coin.y\n  done', press:['right'] },
    { say:"Show the score using the words on the stage, and close forever.", code:'  @scoreText.text = "Score: " + score\ndone', press:['left'] },
    { say:"That's a whole game! Press Try this code to open it in the editor, then press Play.", press:['right'] },
  ]},
  { title:'Painting your own sprites', stage:{ bg:'#ffeaa7', objects:[ ob('hero', 'sprite', 164, 100, 72, 78, '', { costume:'hero' }) ] }, steps:[
    { say:"Open the Paint tab to draw your own pictures, called costumes. There's a brush, a pixel pencil, a fill bucket, shapes, a rainbow brush, and more. This hero was painted there." },
    { say:"Press Add to stage, and your costume becomes a sprite. Sprites are things on the stage, so they use the at sign too." },
    { say:"angle tilts the sprite. Here it rocks back and forth.", code:'forever\n  @hero.angle = sin(frame * 3) * 15' },
    { say:"flip mirrors it, so it can face the other way. yes and no work like on and off.", code:'  @hero.flip = floor(frame / 60) % 2 is 1' },
    { say:"Switching costumes makes animation! hero2 has its legs apart, so swapping makes it walk.", code:'  if floor(frame / 10) % 2 is 0\n    @hero.costume = "hero"\n  otherwise\n    @hero.costume = "hero2"\n  done\ndone' },
  ]},
  { title:'Physics and jumping', stage:{ bg:'#74b9ff', objects:[
      ob('ground', 'rect', 0, 260, 400, 40, '#6ab04c', { solid:1 }),
      ob('ledge', 'rect', 230, 180, 120, 16, '#b8794a', { solid:1 }),
      ob('hero', 'sprite', 30, 150, 36, 39, '', { costume:'hero', physics:1 }),
    ] }, steps:[
    { say:"Doodle has physics built in! In the Design tab, the hero has Physics ticked, and the ground and ledge are Solid." },
    { say:"gravity pulls physics things down. They stop when they land on something solid.", code:'gravity 0.7' },
    { say:"vx is the sideways speed. Set it every frame, depending on the keys.", code:'forever\n  @hero.vx = 0\n  if held(right) -> @hero.vx = 3', press:['right'] },
    { say:"vy is the up and down speed. A negative vy jumps! onground is yes only when standing, so no jumping in mid air.", code:'  if held(up) and @hero.onground\n    @hero.vy = -12\n    play "jump"\n  done\n  fence @hero\ndone', press:['right', 'up'] },
    { say:"Watch it run and jump up onto the ledge!", press:['right', 'up'] },
  ]},
  { title:'Copies: making lots of things', stage:{ bg:'#0b1026', objects:[
      ob('ship', 'sprite', 178, 240, 44, 44, '', { costume:'ship' }),
      ob('laser', 'rect', 0, 0, 4, 14, '#ff4d8d'),
    ] }, steps:[
    { say:"copy makes a copy of a thing. This pink laser is a template, so we hide the original.", code:'hide @laser' },
    { say:"every runs its lines again and again. Here, every 0.3 seconds, we copy the laser, place it at the ship, and shoot it up with vy.", code:'every 0.3s\n  copy @laser as l\n  place @l, @ship.cx - 2, @ship.y\n  @l.vy = -8\n  play "laser"\ndone' },
    { say:"Let's slide the ship from side to side.", code:'forever\n  @ship.x = 178 + sin(frame * 2) * 150' },
    { say:"loop each goes through every copy. When a laser leaves the stage, erase removes it, so the game stays fast.", code:'  loop each l in clones(@laser)\n    if @l.y < -20 -> erase @l\n  done\ndone' },
    { say:"Copies are how you make bullets, enemies, coins, raindrops, and anything else you need lots of." },
  ]},
  { title:'Effects: sparkles, sound and shake', stage:{ bg:'#0b1026', objects:[] }, steps:[
    { say:"Effects make games feel amazing. Let's make a firework show that goes off every 0.8 seconds.", code:'every 0.8s\n  fx = rand(60, stage.w - 60)\n  fy = rand(40, 170)' },
    { say:"sparkle makes a burst: x, y, how many, a color, and how fast. rainbow uses every color.", code:'  sparkle fx, fy, 70, rainbow, 6' },
    { say:"play makes a sound effect, and shake wobbles the whole stage.", code:'  play "explode"\n  shake 5\ndone' },
    { say:"Try the sounds coin, jump, laser, hit, powerup, win and lose. You can play music with tune, and flash the stage with flash." },
  ]},
  { title:'Timers and high scores', stage:{ bg:'#6c5ce7', objects:[] }, steps:[
    { say:"Let's make a score that remembers your best. load gets a saved value. The second number is used the very first time.", code:'score = 0\nbest = load("best", 0)' },
    { say:"Every half a second, add a point.", code:'every 0.5s -> score += 1' },
    { say:"pin on pins your drawing to the screen, so it never moves with the camera. align center centers words, and glow makes them shine.", code:'forever\n  pin on\n  letters 34, "Arial", bold\n  align center\n  ink white\n  glow 8, black' },
    { say:"Show both numbers.", code:'  write stage.w / 2, 90, "Score: " + score\n  write stage.w / 2, 160, "Best: " + best' },
    { say:"save keeps a value forever. When score beats best, we save it, so it's still there next time!", code:'  if score > best\n    best = score\n    save "best", best\n  done\ndone' },
    { say:"save and load work in exported games too, so players keep their best score." },
  ]},
  { title:'Scenes and buttons', stage:{ bg:'#6c5ce7', objects:[] }, steps:[
    { say:"Big games have scenes, like a title screen, the game, and a game over screen. go switches scenes.", code:'when start -> go "title"' },
    { say:"during runs its lines every frame, but only while that scene is showing. Here's the title screen.", code:'during title\n  pin on\n  align center\n  ink white\n  letters 40, "Arial", bold\n  write stage.cx, 80, "Super Game"' },
    { say:"button draws a button and is yes when it gets clicked. pressed is yes on the moment a key goes down. Either one starts the game!", code:'  if button("▶ Play", stage.cx - 60, 170) or pressed(space) -> go "play"\ndone' },
    { say:"when go runs once, as you arrive in a scene. Let's change the color and play a sound.", code:'when go play\n  wash #00b894\n  play "powerup"\ndone' },
    { say:"Now the play scene. scene.time counts the seconds since you arrived, and curly brackets drop a value straight into words!", code:'during play\n  paint gold\n  star stage.cx + wave(3, 120), 150, 40, 5\n  ink white\n  write 10, 10, "Playing for {round(scene.time)} seconds"\ndone' },
    { say:"Watch. Pressing space jumps to the play scene!", press:['space'] },
  ]},
  { title:'Smooth moves and behaviors', stage:{ bg:'#dff9fb', objects:[
      ob('hero', 'sprite', 182, 130, 36, 39, '', { costume:'hero' }),
      ob('coin', 'star', 20, 230, 40, 40, '#f7b731'),
      ob('moon', 'circle', 0, 0, 22, 22, '#a4b0be'),
      ob('ghost', 'sprite', 330, 20, 40, 40, '', { costume:'ghost' }),
    ] }, steps:[
    { say:"glide moves a thing smoothly to a spot. It speeds up, then slows down, like real motion.", code:'glide @coin to 330, 40 in 2s' },
    { say:"animate can smoothly change any number property. This spins the coin twice while it glides.", code:'animate @coin.angle to 720 in 2s' },
    { say:"Behaviors keep going all by themselves. orbit makes the moon circle around the hero.", code:'orbit @moon, @hero, 70, 3' },
    { say:"chase makes the ghost follow the hero. There's also flee, to run away, and wander, to roam around.", code:'chase @ghost, @hero, 0.8' },
    { say:"Let's make the hero sway left and right, so you can see everything follow it.", code:'forever -> @hero.x = 182 + wave(2, 130)' },
    { say:"calm stops a thing's behaviors. And cycle swaps costumes automatically, for easy walking animations." },
  ]},
  { title:'Atmosphere: weather, darkness, music', stage:{ bg:'#2d3436', objects:[
      ob('hero', 'sprite', 182, 200, 36, 39, '', { costume:'hero' }),
      ob('lamp', 'circle', 300, 60, 18, 18, '#ffeaa7'),
    ] }, steps:[
    { say:"weather adds rain, snow, leaves, confetti or bubbles, with one word.", code:'weather "rain"' },
    { say:"dark covers the stage in darkness. 1 is pitch black.", code:'dark 0.88' },
    { say:"light makes a glow around a thing, so you can see near it.", code:'light @hero, 110\nlight @lamp, 60' },
    { say:"talk shows a speech bubble over a thing for a few seconds. Great for stories!", code:'talk @hero, "Who turned off the lights?", 3' },
    { say:"music plays a looping song. Try happy, chill, spooky, chase, space or victory. music none stops it.", code:'music "spooky"' },
    { say:"Let's take a walk in the rain.", code:'forever -> @hero.x = 182 + wave(1.5, 140)' },
    { say:"Next, let's make things move with the keyboard, without writing any code at all." },
  ]},
  { title:'Move with keys — no code!', stage:{ bg:'#dff9fb', objects:[
      ob('hero', 'sprite', 60, 120, 36, 39, '', { costume:'hero' }),
      ob('ship', 'sprite', 300, 200, 40, 40, '', { costume:'ship' }),
    ] }, steps:[
    { say:"In the Design tab, click a thing, and under Move it with keys, pick arrow keys, W A S D, or press any keys you like. That's it, no code!" },
    { say:"In code, it's one line: controls, the thing, which keys, and how fast. Watch the D key move the hero right.", code:'controls @hero, "wasd", 4', press:['d'] },
    { say:"And S moves it down.", press:['s'] },
    { say:"action picks a key that makes it do something, like jump, shoot, spin, or sparkle.", code:'action @hero, "space", "sparkle"', press:['space'] },
    { say:"The drive style turns with left and right, and goes forward with up. Perfect for spaceships and cars! Here we picked the letters I J K L.", code:'controls @ship, "ijkl", 3, "drive"', press:['i', 'j'] },
    { say:"There's also a platform style, for running and jumping. Walls that are Solid will block things you move with keys." },
  ]},
  { title:'Wait: telling a story', stage:{ bg:'#ffeaa7', objects:[
      ob('hero', 'sprite', 60, 180, 36, 39, '', { costume:'hero' }),
      ob('ghost', 'sprite', 300, 170, 40, 40, '', { costume:'ghost' }),
    ] }, steps:[
    { say:"wait pauses your code for a moment, then keeps going. It's perfect for stories and cutscenes.", code:'talk @hero, "Hello? Anyone here?", 1.5\nwait 1.5s' },
    { say:"Now the ghost answers.", code:'talk @ghost, "Boo!", 1.2\nshake 6\nwait 1.2s' },
    { say:"glide moves the hero away, and wait lets it finish before the next line.", code:'glide @hero to 10, 180 in 0.8s\nwait 1s' },
    { say:"And the ending.", code:'talk @hero, "I am out of here!", 2\nplay "win"' },
    { say:"wait works inside forever too: the forever block simply waits before running again. wait until waits for something to become true." },
  ]},
  { title:'Commands that give answers, and records', steps:[
    { say:"You can teach Doodle a command that works out an answer. give sends the answer back.", code:'teach double n\n  give n * 2\ndone' },
    { say:"Now use it like any other function. Curly brackets put the answer right into the words.", code:'paper 400, 300, white\nletters 26, "Arial", bold\nink black\nwrite 20, 20, "double(21) = {double(21)}"' },
    { say:"A record keeps lots of values together, each with a name. Use a dot to read or change them.", code:'hero = { name: "Sam", hp: 10 }\nhero.hp -= 3\nwrite 20, 80, "{hero.name} has {hero.hp} hp"' },
    { say:"loop each can also count where it is. Here n is each name and i is its position.", code:'loop each n, i in ["Ann", "Bo", "Cy"] -> write 20, 140 + i * 40, "{i + 1}. {n}"' },
    { say:"Doodle also has loop i from 1 to 10, match and case, and try with otherwise to catch mistakes. Check the Guide for all of them!" },
  ]},
  { title:'Build levels from text', stage:{ width:400, height:300, bg:'#2d3436', objects:[
      ob('wall', 'rect', 0, 0, 40, 40, '#6c5ce7', { solid:1 }),
      ob('coin', 'sprite', 0, 0, 20, 20, '', { costume:'coin' }),
      ob('hero', 'sprite', 0, 0, 26, 28, '', { costume:'hero' }),
    ] }, steps:[
    { say:"You can draw a whole level with letters! Each row is a line of text. Long lists can go over many lines.", code:'level = [\n  "##########",\n  "#P  o   o#",\n  "#  ###   #",\n  "#o   #  o#",\n  "##########"\n]' },
    { say:"tile says what each letter means. The hash is a wall, o is a coin, and P is the hero. once means use the real hero instead of a copy.", code:'tile "#", @wall\ntile "o", @coin\ntile "P", @hero, once' },
    { say:"build makes the level. The number is how big each square is.", code:'build level, 40' },
    { say:"Add arrow keys, and the walls block the hero. A whole maze game in a few lines!", code:'controls @hero, "arrows", 3', press:['right'] },
    { say:"Next, let's learn functions you can keep in a box, and pass around like any other value." },
  ]},
  { title:'Functions you can keep in a box', steps:[
    { say:"A function is a little machine: inputs go in, an answer comes out. Write the inputs, an arrow, and the answer, inside round brackets. Then keep it in a variable.", code:'double = (n -> n * 2)\npaper 400, 300, white\nletters 22, "Arial", bold\nink black\nwrite 20, 20, "double(21) = {double(21)}"' },
    { say:"keep uses a function to keep only some items from a list. Here we keep the numbers bigger than 4.", code:'nums = [3, 8, 1, 12, 5]\nwrite 20, 70, "big: {keep(nums, (n -> n > 4))}"' },
    { say:"change runs a function on every item and makes a new list.", code:'write 20, 120, "x10: {change(nums, (n -> n * 10))}"' },
    { say:"squash crunches a whole list into one value. This function adds each number onto a running total, starting at 0.", code:'write 20, 170, "total: {squash(nums, (t, n -> t + n), 0)}"' },
    { say:"Functions can go into your own commands too. twice runs any function two times!", code:'teach twice f, x\n  give f(f(x))\ndone\nwrite 20, 220, "twice double 5 = {twice(double, 5)}"' },
    { say:"There's also findfirst, allof, anyof and sortwith. Next: messages and touch events." },
  ]},
  { title:'Messages and touch events', stage:{ bg:'#e0f7fa', objects:[
      ob('hero', 'sprite', 40, 180, 36, 39, '', { costume:'hero' }),
      ob('coin', 'sprite', 200, 190, 24, 24, '', { costume:'coin' }),
      ob('gem', 'sprite', 320, 190, 24, 24, '', { costume:'gem' }),
    ] }, steps:[
    { say:"when touches runs a block once, at the moment two things start touching. it is the thing that was touched.", code:'score = 0\nwhen @hero touches @coin\n  score += 1\n  play "coin"\n  sparkle @it.cx, @it.cy, 30, gold\n  erase @it\ndone' },
    { say:"send shouts a message. Every when get block with that name hears it. message is whatever you sent along.", code:'when get "win"\n  talk @hero, message, 2\n  play "win"\ndone\nwhen @hero touches @gem -> send "win", "I found the gem!"' },
    { say:"Now walk the hero over both of them.", code:'controls @hero, "arrows", 4', press:['right'] },
    { say:"Messages let different parts of your game talk to each other without getting tangled. There's also when release, for when a key is let go." },
  ]},
  { title:'Story menus, typewriters and behaviors', stage:{ bg:'#2d3436', objects:[
      ob('label', 'text', 20, 20, 360, 30, '#ffffff', { text:'' }),
      ob('guard', 'sprite', 40, 220, 36, 39, '', { costume:'hero' }),
      ob('gem', 'sprite', 300, 120, 24, 24, '', { costume:'gem' }),
    ] }, steps:[
    { say:"typewrite types words out one letter at a time, like an old computer.", code:'typewrite @label, "A strange gem glows in the dark...", 24\nwait until not typing(@label)' },
    { say:"bob makes a thing float up and down, pulse makes it throb, and trail leaves sparkly dust behind it.", code:'bob @gem, 8, 2\npulse @gem, 0.2, 3\ntrail @gem, rainbow' },
    { say:"patrol walks between spots, over and over. Great for guards and enemies!", code:'patrol @guard, [[40, 220], [300, 220]], 2' },
    { say:"choose shows a menu, and waits until the player picks something. Here the player presses 1.", code:'choose "Take the gem?", ["Yes!", "No, leave it"], answer\ntypewrite @label, "You said: " + answer', press:['1'] },
    { say:"Next: drawing with a turtle, and records that have their own functions." },
  ]},
  { title:'Turtle drawing and smart records', isNew:true, steps:[
    { say:"The turtle is a little pen you steer. turtle puts it on the paper, walk moves it forward and draws, and turn turns it.", code:'paper 600, 400, white\nink purple\nbrush 4\nturtle 100, 100\nwalk 120\nturn 90\nwalk 120' },
    { say:"Put walk and turn in a loop and you get shapes. Four sides and 90 degree turns make a square.", code:'turtle 300, 60\nink orange\nloop 4\n  walk 100\n  turn 90\ndone' },
    { say:"Change the color and length each time, and you get a spiral.", code:'turtle 470, 280\nbrush 2\nloop 60 as i\n  ink hsl(i * 6, 90, 55)\n  walk i * 2\n  turn 61\ndone' },
    { say:"Records can keep functions too. Inside them, me means the record itself.", code:'dog = { name: "Rex", hello: ( -> "Woof! I am " + me.name) }\nletters 22, "Arial", bold\nink black\nwrite 20, 340, dog.hello()' },
    { say:"skip jumps to the next turn of a loop, and fail makes your own mistake on purpose, for try to catch. That's everything! Open Examples for full games, and press Guide in the Code tab to see every Doodle word." },
  ]},
];

const vEngine = new Engine($('#vcanvas'));
const T = { li:0, si:0, playing:false, token:0, speed:1, voice:'speechSynthesis' in window, done:new Set() };
try { JSON.parse(localStorage.getItem('doodle-lessons-done') || '[]').forEach(i => T.done.add(i)); } catch (e) {}
const flat = []; LESSONS.forEach((L, li) => L.steps.forEach((s, si) => flat.push({ li, si })));
const gIndex = (li, si) => flat.findIndex(f => f.li === li && f.si === si);

function lessonCode(li, upto) { return LESSONS[li].steps.slice(0, upto).filter(s => s.code).map(s => s.code).join('\n'); }
function closeBlocks(code) {
  let d = 0;
  for (const raw of code.split('\n')) {
    const l = stripComment(raw).trim();
    if (OPENERS.test(l) && !splitArrow(l)) d++;
    else if (/^(done|end)$/i.test(l)) d--;
  }
  return code + '\ndone'.repeat(Math.max(0, d));
}
function lessonProject(li) {
  const s = LESSONS[li].stage || {};
  return { width:s.width || 400, height:s.height || 300, bg:s.bg || '#ffffff', backdrop:null, costumes:{ ...builtinCostumes() }, objects:deep(s.objects || []) };
}
function runPreview(code, li, keys) {
  vEngine.muted = !T.voice;
  vEngine.load(closeBlocks(code), lessonProject(li));
  vEngine.start();
  vEngine.keys = new Set(keys || []);
  for (const k of keys || []) vEngine.keyDown(k, false);
}
function renderVCode(code, typing) {
  const lines = code ? code.split('\n') : [''];
  $('#vcode').innerHTML = lines.map((l, i) => {
    const cur = i === lines.length - 1;
    return `<div class="ln${cur && typing ? ' cur' : ''}"><span class="no">${i + 1}</span>${hl(l)}${cur ? '<span class="caret"></span>' : ''}</div>`;
  }).join('');
  const box = $('#vcode'); box.scrollTop = box.scrollHeight;
}
function setCaption(t) { $('#vcaption').textContent = t || ''; }
function showTitle(small, big, sub) {
  const el = $('#vtitle');
  el.innerHTML = `<small>${esc(small)}</small><div>${esc(big)}</div>${sub ? `<p>${esc(sub)}</p>` : ''}`;
  el.classList.add('show');
}
function hideTitle() { $('#vtitle').classList.remove('show'); }
function speak(text) {
  if (!T.voice || !window.speechSynthesis) return Promise.resolve();
  return new Promise(res => {
    let done = false; const fin = () => { if (!done) { done = true; res(); } };
    const u = new SpeechSynthesisUtterance(text);
    u.rate = Math.min(2, Math.max(0.5, T.speed)); u.lang = 'en-US';
    u.onend = fin; u.onerror = fin;
    setTimeout(fin, (text.split(' ').length * 520 + 2500) / T.speed);
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  });
}
function markDone(li) {
  T.done.add(li);
  try { localStorage.setItem('doodle-lessons-done', JSON.stringify([...T.done])); } catch (e) {}
}
function updateVUI() {
  const L = LESSONS[T.li];
  $('#vplay').textContent = T.playing ? '⏸' : '▶';
  $('#bigplay').style.display = T.playing ? 'none' : '';
  $('#vpos').textContent = `Lesson ${T.li + 1}/${LESSONS.length} · ${L.title}`;
  $('#vfill').style.width = (100 * (gIndex(T.li, T.si) + 1) / flat.length) + '%';
  $$('#lessonList li').forEach((li, i) => { li.classList.toggle('on', i === T.li); li.classList.toggle('done', T.done.has(i) && i !== T.li); });
}

async function playFrom(li, si) {
  const tok = ++T.token; T.playing = true;
  const alive = () => T.token === tok;
  const wait = ms => new Promise(r => setTimeout(r, ms / T.speed));
  let firstStep = true;
  while (li < LESSONS.length) {
    const L = LESSONS[li];
    let code = lessonCode(li, si);
    T.li = li; T.si = si; updateVUI();
    renderVCode(code, false); runPreview(code, li, []);
    if (si === 0) {
      setCaption('');
      showTitle(`Lesson ${li + 1}`, L.title);
      speak(`Lesson ${li + 1}. ${L.title}.`);
      await wait(2200); if (!alive()) return;
      hideTitle();
    }
    for (; si < L.steps.length; si++) {
      const s = L.steps[si];
      T.si = si; updateVUI();
      setCaption(s.say);
      const t0 = performance.now();
      const speech = speak(s.say);
      if (s.code) {
        const base = code ? code + '\n' : '';
        for (let c = 1; c <= s.code.length; c++) {
          if (!alive()) return;
          renderVCode(base + s.code.slice(0, c), true);
          const ch = s.code[c - 1];
          await wait(ch === ' ' ? 16 : ch === '\n' ? 150 : 38);
        }
        code = base + s.code;
        renderVCode(code, false);
        runPreview(code, li, s.press);
      } else if (firstStep || s.press) runPreview(code, li, s.press);
      else vEngine.keys = new Set();
      firstStep = false;
      await speech; if (!alive()) return;
      const minRead = T.voice ? 0 : Math.max(1800, s.say.split(' ').length * 330);
      const spent = (performance.now() - t0) * T.speed;
      if (spent < minRead) await wait(minRead - spent);
      await wait(s.press ? 1800 : 900); if (!alive()) return;
    }
    markDone(li);
    li++; si = 0;
  }
  T.playing = false; T.li = LESSONS.length - 1; T.si = LESSONS[T.li].steps.length - 1; updateVUI();
  setCaption('');
  showTitle('The end', 'Now make your own game! 🎉', 'Paint sprites in the Paint tab, put them on the stage in Design, and bring them to life with Doodle.');
  speak('The end. Now go and make your own game!');
}
function pauseVideo() {
  if (!T.playing) return;
  T.token++; T.playing = false;
  if (window.speechSynthesis) speechSynthesis.cancel();
  vEngine.pause(); updateVUI();
}
function resumeVideo() { hideTitle(); playFrom(T.li, T.si); }
function toggleVideo() { T.playing ? pauseVideo() : resumeVideo(); }
function jumpTo(li, si) {
  const was = T.playing;
  pauseVideo();
  T.li = li; T.si = si;
  hideTitle();
  if (was || si === 0) { playFrom(li, si); return; }
  const code = lessonCode(li, si + 1);
  renderVCode(code, false); setCaption(LESSONS[li].steps[si].say);
  runPreview(code, li, LESSONS[li].steps[si].press); updateVUI();
}

$('#video').onclick = toggleVideo;
$('#vplay').onclick = toggleVideo;
$('#vprev').onclick = () => jumpTo(T.si > 0 ? T.li : Math.max(0, T.li - 1), 0);
$('#vnext').onclick = () => jumpTo(Math.min(LESSONS.length - 1, T.li + 1), 0);
$('#vspeed').onchange = e => { T.speed = +e.target.value; };
$('#vvoice').onclick = () => {
  T.voice = !T.voice;
  $('#vvoice').textContent = T.voice ? '🔊 Voice on' : '🔇 Voice off';
  if (!T.voice && window.speechSynthesis) speechSynthesis.cancel();
  vEngine.muted = !T.voice;
};
$('#vbar').onclick = e => {
  const r = e.currentTarget.getBoundingClientRect();
  const i = Math.min(flat.length - 1, Math.max(0, Math.floor((e.clientX - r.left) / r.width * flat.length)));
  jumpTo(flat[i].li, flat[i].si);
};
$('#vtry').onclick = () => {
  const L = LESSONS[T.li];
  if (!confirm(`Open Lesson ${T.li + 1} ("${L.title}") in the editor?\nThis replaces your current project. (Use File → Save to file first to keep it.)`)) return;
  pauseVideo();
  const P = lessonProject(T.li);
  const used = new Set(P.objects.map(o => o.costume).filter(Boolean));
  if (L.title.startsWith('Painting')) used.add('hero2');
  P.costumes = Object.fromEntries(Object.entries(P.costumes).filter(([k]) => used.has(k)));
  loadProject({ ...P, code:'~ Lesson ' + (T.li + 1) + ': ' + L.title + '\n' + lessonCode(T.li, L.steps.length) + '\n' }, '✏️ Lesson code opened — press Play!');
  switchTab('code');
};
function buildLearn() {
  const ol = $('#lessonList');
  LESSONS.forEach((L, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${esc(L.title)}</span>${L.isNew ? '<span class="new">NEW</span>' : ''}`;
    li.onclick = () => jumpTo(i, 0);
    ol.appendChild(li);
  });
  $('#lessonCount').textContent = LESSONS.length;
  const bar = $('#vbar');
  LESSONS.forEach((L, i) => { if (!i) return; const t = document.createElement('div'); t.className = 'vtick'; t.style.left = (100 * gIndex(i, 0) / flat.length) + '%'; bar.appendChild(t); });
  if (!T.voice) { $('#vvoice').textContent = '🔇 No voice'; $('#vvoice').disabled = true; }
  renderVCode('', false);
  runPreview('', 0, []);
  showTitle('Doodle Studio', 'Learn to code, step by step', `${LESSONS.length} short video lessons — from your first shape to painting sprites, physics, and your own games. Press ▶ to start.`);
  updateVUI();
}

// =====================================================================
//  START UP
// =====================================================================
(function init() {
  let theme = 'dark'; try { theme = localStorage.getItem('doodle-theme') || 'dark'; } catch (e) {}
  setTheme(theme);
  setTool('brush'); setColor('#ff4d8d');
  buildExamples(); buildSnippets(); buildRef(); buildLearn();
  loadAll(); resetHistory();
  switchTab('design');
})();
