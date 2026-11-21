# 🎨 Doodle Studio

A game engine that runs in your web browser, with its own programming language: **Doodle**.

Doodle reads like instructions to an artist. You **paint** and **ink** on **paper**, **write** words, and stick on **stickers**. Anything on the stage gets an **@**, every block ends with **done**, and a quick rule fits on one line with an arrow **->**.

```
~ ⭐ catch the star!
score = 0

forever
  if held(left) -> @player.x -= 5
  if held(right) -> @player.x += 5
  fence @player

  if @player touches @coin
    score += 1
    sparkle @coin.cx, @coin.cy, 30, gold
    play "coin"
    place @coin, dice(20, stage.w - 60), @coin.y
  done

  @scoreText.text = "Score: " + score
done
```

## What's inside

- **🧩 Design**: put things on the stage with your mouse. You can add boxes, circles, stars, triangles, words, and sprites. Under **🎮 Move it with keys**, pick arrow keys, W A S D, or any keys you like to move a thing, with no code at all. You can also set an **action key** that makes it jump, shoot, spin, or sparkle.
- **🖌️ Paint**: draw your own sprites and backgrounds. Tools include a brush, pixel pencil, fill bucket, shapes, rainbow brush, glow brush, mirror mode, and more.
- **📝 Code**: write Doodle with colored code, autocomplete (type `@` to see your things), a searchable **Guide**, and an **Insert** menu of ready-made code.
- **🎬 Learn**: 25 step-by-step video lessons, from your first doodle all the way to scenes, physics, copies, waiting, records, levels built from text, functions you can pass around, messages, and story menus.
- **✨ Examples**: Gem Quest, Maze Runner, Haunted Garden, Coin Catcher, Platform Jumper, Space Shooter, Fireworks, Bouncy Balls, and Art with Code.
- **🚀 Export game**: makes a `.doodle` game that opens in its own app window when you double-click it, with no warnings. It can also make an `.html` file for any computer or website.

## Exporting a game

Press **🚀 Export game**, choose a name, and pick one:

- **🎮 App game (`.doodle`)**, the main choice: double-click it and your game opens in **its own window, like an app**, with no tabs and no address bar. There's nothing to unzip and no warnings. It needs **Doodle Player**, a quick one-time setup on each Windows computer (see below).
- **📄 Single game file (`.html`)**: works on any computer with no setup (Windows, Mac, Chromebook). It opens in a web browser and fills the screen when you press **▶ Play**.
- **🌐 Web page for a website**: the same game in a normal browser window, for GitHub Pages or any website.

### Setting up Doodle Player (once per computer)

1. In the export window, click **📋 Copy setup**.
2. Press the **Windows key**, type **PowerShell**, and press **Enter**.
3. Press **Ctrl+V** to paste, then **Enter**. If it asks about pasting several lines, click **Paste anyway**. When it says **Doodle Player is ready!** you can close it.

From then on, double-clicking any `.doodle` game opens it in its own window. The setup doesn't need an administrator, and it only changes your own Windows account. It teaches Windows that `.doodle` files are games, and it opens them in Microsoft Edge's app mode with a separate Doodle profile. The export window shows the exact code, plus a line that removes Doodle Player again.

**Why a setup step?** Windows warns about, or blocks, any *downloaded* file that can run a program, unless it's signed with a paid Microsoft-trusted certificate. A `.doodle` game is only game data, not a program, so Windows has nothing to warn about. Doodle Player is set up by you typing it in, not by downloading a program, so nothing gets blocked.

Saved high scores (`save` / `load`) are kept between plays.

## Running it

Open **`index.html`** in a web browser. You don't need to install anything. Chrome or Edge is best, because the lessons use the browser's voice.

To put it online, upload `index.html` to a GitHub repository. Then go to **Settings → Pages**, pick your main branch, and save. GitHub gives you a link anyone can use.

## The Doodle language

### The Doodle style
| | |
|---|---|
| `~ a note` | Notes start with a squiggle. Doodle skips them. |
| `@player` | `@` means a thing on the stage. |
| `done` | Every block ends with `done`. |
| `if score > 9 -> play "win"` | One-line blocks use an arrow and don't need `done`. |
| `yes` / `no` | On and off. |

### Drawing
| | |
|---|---|
| `paper 600, 400, skyblue` | Stage size and color |
| `wash navy` | Cover everything with one color |
| `paint orange` / `paint none` | Inside color |
| `ink black` / `ink none` | Outline and word color |
| `brush 4` | Outline thickness |
| `blend #ff9a9e, #a18cd1` | Two-color blend |
| `fade 0.5` | See-through |
| `glow 10, black` | Soft glow |
| `pin on` | Pin drawings to the screen, so the camera doesn't move them |
| `circle` `oval` `box` `roundbox` `line` `arc` `triangle` `poly` `star` | Shapes |
| `write 20, 20, "Hi"` · `letters 32, "Georgia", bold` · `align center` | Words |
| `sticker "hero", 50, 80` | Stick on a painted costume |

### Logic
| | |
|---|---|
| `score = 0` · `score += 1` | Remember and change values |
| `if … / but if … / otherwise / done` | Decisions. Compare with `is` `isnt` `<` `>`, and combine with `and` `or` `not`. |
| `loop 10 as i … done` | Repeat |
| `loop each c in clones(@coin) … done` | Go through a list |
| `loop while x < 100 … done` · `escape` | Loop while something is true · leave a loop early |
| `teach jump power … done` then `jump 12` | Teach Doodle your own commands |

### Events
`when start` · `forever` (60 times a second) · `when key space` · `when any key` · `when click` · `when click @button` · `every 2s` · `later 3s`

### Things on the stage
| | |
|---|---|
| `@p.x .y .w .h .cx .cy .right .bottom` | Position, size, middle, and edges |
| `@p.angle .alpha .flip .color .text .costume .visible` | How it looks |
| `@p.vx .vy .physics .solid .onground` | Movement and physics |
| `show` `hide` `nudge` `place` `face` `step` `fence` `wrap` `bounce` | Commands for things |
| `@player touches @coin` | Are they touching? This works with copies too, and tells you which copy. |
| `hovered(@button)` · `gap(@a, @b)` | Mouse over it? · distance between two things |
| `copy @rock as r` · `clones(@rock)` · `erase @r` · `pop @r` · `offscreen(@r)` | Copies |

### World, effects and sound
`gravity 0.7` · `follow @hero` · `world 2000, 400` · `camera x, y` · `sparkle x, y, 40, gold, 5` · `shake 10` · `flash red` · `backdrop "space"` · `play "coin"` · `note "C5", 300` · `tune "C4 E4 G4", 150` · `beep 440, 100`

### Values and helpers
`held(left)` · `mouse.x` `mouse.y` `mouse.down` · `stage.w` `stage.h` · `frame` `time` `lastkey` · `rand(1, 10)` `dice(1, 6)` `chance(25)` · `round` `floor` `ceil` `abs` `sqrt` `pow` `min` `max` `clamp` `mix` · `sin` `cos` `angleto` `dist` · `rgb` `hsl`

### Lists, words and saving
`things = [1, 2, 3]` · `things[0]` · `add` `drop` `put` `sort` `shuffle` · `size` `pick` `contains` `indexof` `sorted` · `upper` `lower` `part` `split` `join` `str` `num` · `save "best", score` · `load("best", 0)` · `ask "Name?", name` · `say "hi"` · `stop`

### Move with keys (no code needed)
| | |
|---|---|
| `controls @hero, "wasd", 4` | Move with `"arrows"`, `"wasd"`, `"ijkl"`, or 4 keys of your own (up, left, down, right), at a speed. Solid walls block it. |
| `controls @hero, "arrows", 4, "platform"` | Styles: `"move"` (walk around), `"platform"` (run and jump), `"drive"` (turn and go) |
| `action @hero, "space", "shoot"` | A key that makes it jump, shoot, spin, sparkle, grow, shrink, change color, hide, or play a sound |

You can set all of this in the Design tab without writing any code.

### A full programming language
| | |
|---|---|
| `wait 1s` · `wait until @door.visible` | Pause, then carry on. Great for stories and cutscenes. |
| `teach double n` / `give n * 2` / `done` | Commands that give back an answer: `say double(21)`. Recursion works, and new names inside stay local. |
| `hero = { name: "Sam", hp: 10 }` · `hero.hp -= 3` | Records: many values together, each with a name. Use `keys` `values` `has` `sortby`. |
| `loop i from 1 to 10 by 2` · `loop each name, i in names` | Counting loops, and loops that know their position |
| `try` / `otherwise` / `done` | Catch mistakes. `problem` says what went wrong. |
| `level = [ "#####", "#P o#", "#####" ]` · `tile "#", @wall` · `build level, 32` | Build whole levels from letters. Lists can go over many lines. |
| `type(x)` `int` `mod` `log` `exp` `chars` `copies` `slice` `combine` `count` `side(@a, @b)` `today()` `hour()` `weekday()` | More helpers |

### Functions you can keep in a box
| | |
|---|---|
| `double = (n -> n * 2)` · `say double(21)` | A function value: the inputs, an arrow, then the answer, in round brackets |
| `(a, b -> a + b)` · `( -> dice(1, 6))` | Many inputs, or none |
| `keep(nums, (n -> n > 4))` · `change(nums, (n -> n * 10))` | Keep some items · change every item |
| `squash(nums, (t, n -> t + n), 0)` | Squash a list into one value |
| `findfirst` `allof` `anyof` `sortwith` `use(f, 1, 2)` `isfunction(f)` | More helpers that take functions |
| `teach twice f, x` / `give f(f(x))` / `done` | Pass functions into your own commands. A taught command's name works too: `keep(nums, "isbig")` |

### Messages and events
| | |
|---|---|
| `send "boom", 5` and `when get "boom" … done` | Send a message to every `when get` block. `message` holds the value sent with it. |
| `when @hero touches @coin … done` | Runs once each time they start touching. Works with copies, and `it` is the one that was touched. |
| `when release space … done` | Runs when a key is let go |

### Story tools and behaviors
| | |
|---|---|
| `choose "Which way?", ["Left", "Right"], way` | A menu that waits until the player picks: click it, or press 1, 2, 3, or the arrow keys and Enter |
| `typewrite @label, "Hello!", 20` · `typing(@label)` | Type words out letter by letter · yes while it's still typing |
| `patrol @guard, [[100, 200], [400, 200]], 2` | Walk between spots, over and over |
| `bob @coin, 8, 2` · `pulse @star, 0.2, 3` · `trail @comet, rainbow` | Float up and down · throb · leave sparkly dust |
| `shoot @ship, @laser, -90, 10` | Fire a copy at an angle (-90 is up) and speed. It disappears when it leaves the stage. |
| `snap(x, 32)` · `noise(frame / 60)` · `percent(a, b)` | Round to a grid · smooth random · percent |

### Scenes, buttons and menus
| | |
|---|---|
| `go "menu"` | Switch scenes, like a title screen, levels, or game over |
| `when go menu … done` | Runs once when you arrive in a scene |
| `during menu … done` | Runs every frame while that scene is showing |
| `scene` · `scene.time` | The current scene, and seconds since you arrived |
| `restart` | Start the whole game again |
| `if button("Play", x, y) -> go "play"` | A clickable button |
| `bar x, y, w, h, health, 100, red` | A health or progress bar |
| `pressed(space)` · `mouse.clicked` | yes only on the moment a key or the mouse goes down |
| `watch score, lives` | Show values in the corner while you test |
| `"Score: {score}"` | Curly brackets drop a value straight into words |

### Smooth moves and behaviors
| | |
|---|---|
| `glide @coin to 300, 200 in 1s` | Move smoothly to a spot |
| `animate @coin.angle to 360 in 2s` | Smoothly change any number |
| `spin @coin, 5` · `grow @hero, 1.5` · `launch @ball, 45, 8` | Turn, resize, or send flying |
| `chase @ghost, @hero, 1.5` · `flee` · `orbit @moon, @earth, 80, 2` · `wander @slime, 1.5` | Behaviors that keep going by themselves |
| `cycle @hero, ["walk1", "walk2"], 8` · `calm @ghost` | Automatic costume animation · stop all behaviors |
| `@box.grab = yes` | Lets the player drag it with the mouse |
| `make box @wall, 100, 300, 200, 20, gray` | Create new things from code (box, circle, star, triangle, words, sprite) |
| `front @hero` · `back @cloud` | Change which things are drawn on top |
| `nearest(@hero, @coin)` · `count(@coin)` · `edge(@ball)` | Find things |

### Story and atmosphere
`talk @hero, "Hello!", 2` (speech bubbles) · `weather "rain"` (or snow, leaves, confetti, bubbles) · `dark 0.8` with `light @hero, 120` · `trails 0.4` · `music "spooky"` (or happy, chill, chase, space, victory) · `volume 0.5` · `zoom 2` · more sounds: `coinbig` `zap` `boing` `pop` `step` `magic` `alarm`

### More helpers
`match x` / `case 1, 2` / `otherwise` / `done` · `loop until x > 5` · `heart` `dot` `shape [points]` `emoji "🍕", x, y, size` · `wave(speed, size)` `between` `even` `odd` · `commas` `pad` `clock` · `randomcolor()` `lighter` `darker` · `range` `sum` `average` `first` `last` `reverse` `unique` · `insert` `empty` · `length` `trim` `replace` `starts` `ends`

The **📖 Guide** button in the Code tab explains every word, with examples. Projects made with older versions of Doodle Studio still run.

## Files

```
index.html        the whole app in one file (open or upload this)
README.md         this file
source/           the parts index.html is built from (optional, for programmers)
  engine.js       the Doodle language: tokenizer, parser, interpreter, physics, sound, sparkles
  app.js          Design and Code tabs, autocomplete, Guide, Insert menu, files
  paint.js        the Paint tab
  lessons.js      the video lessons
  art.js          built-in pixel art and example games
  style.css       the look (dark and light themes)
  body.html       the page layout
  build.js        rebuilds index.html from the parts:  node source/build.js
```

You don't need the `source` folder to use the app. To change how Doodle Studio works, edit those files and run `node source/build.js`. That last step needs [Node.js](https://nodejs.org).
