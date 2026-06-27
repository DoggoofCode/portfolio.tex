## Abstract

I am especially interested in AI-driven experiences and the mathematics behind them, and I like learning those concepts by rebuilding them in code through data visualizations and interactive models.

Keywords: machine learning, transformers, data visualization, front-end engineering, mathematics.

## Focus Areas

Finding the intersection between mathematics and machine learning through recreation models, such as transformers, quick and high-fidelity prototyping of AI models, and learning new mathematical concepts through code

## Projects
These are a few of my best projects. You can see more on my [github page](https://github.com/Doggoofcode)

<!-- dev:start -->
### Test Project
Built a component library for documentation-heavy products with paper-like reading ergonomics and
precise grid behavior.

#### Ideas
- Component tokens mirrored into design and code
- Editorial typography presets for long-form content

<demo-1></demo-1>

Artifacts: see [Appendix](#appendix).

It is said that
> Hello world
> 
> Some guy

It is obviously the way to go!
<!-- dev:end -->

### VAE for Synthetic Data

Within this project I used a VAE _(Variational Autoencoder)_ to create synthetic data of numbers and fruits. VAE's take complex data and distills it into the simpler building blocks, for example, the tilt of the character or the position of the character. All of this data is put into a _latent space_, which can be thought of as a smaller image, or a point in a higher dimensional space. As you put more points in this space, the model slowly begins to put similar inputs closer, and different inputs farther apart in this space (i.e. images of the digit one closer to each other, while images of the digit eight farther apart from the previous images).

<vae-structure-demo></vae-structure-demo>

> Each point is a unique image, represented by 20 different sliders. This visualization compacts those 20 dimensions into a 2d space, as shown. See all position data at the [Appendix](#appendix)

#### Applications

Synthetic data from VAEs are incredibly useful models that can generate synthetic data for models. To generate synthetic data similar to a source image, a VAE should be used to encode it into the latent space. Then, within the latent space, the point can be moved and shifted slightly. After decoding the image, the output is a slightly shifted but similar image to what went in.

This process can be adapted for more than one image. To merge two images, you need the point in space which the two images inhabit, then draw a line between them. Each point in that line represents a unique combination of the two source images, Moreover, the line's midpoint represents a combination of the two images

![An interpolation between digits 1 and 8](./vae_content/interpolation_8_to_7.png)
> An interpolation between digits 1 and 8

#### <fold>Running the model</fold>
You can run the VAE by downloading the model in the [appendix](#appendix/), and can be used for decoding saved latents and merging 5 of the same digit into one.

To start make sure that you have python installed on your computer and run `pip install torch torchvision`. Also make sure that you have downloaded model.pt, latents.json, and inference.py in the appendix. Then at the top of inference.py, you will see: 

```python
GOAL = "generate data" # Can you choose between "output image" or "generate data"
MODEL_PATH = "path/to/model.pt"
IMAGE_PATH = "path/to/output_image.png"
LATENTS_PATH = "path/to/latents.json"
```
You can either generate data, which takes 5 of the same digit and outputs new data of their combination, or output an image, which decodes one of the latents of a chosen image stored in latents.json. Afterwards, remember to change the path of the model, latents and output_file based on your system.

### Custom Programming Language

I created a custom assembly-like programming language called `ssl` _(Simple Scripting Language)_, with an operator-operand style language for scripting. The project originally started as an off shoot of [p2pchat](https://github.com/DoggoofCode/p2pchat). 


#### Interpreter Architecture

The interpreter is broken up into 5 main stages, the resolver which finds and resolves import statements from python and ssl. Next the tokenizer _(which contains both the lexer and the tokenizer)_ breaks down the code into logical pieces then assigns them a token based on their type _(e.g. literal, keyword and identifier)_. It then finds all the labels, essentially how functions and loops are defined, and creates a tree to ensure scoping is enforced. Afterwards, the generated AST is executed.

<programming-demo></programming-demo>

#### Language Specifications

SSL is an assembly-style scripting language. Every program is a sequence of **statements** separated by semicolons (`;`), grouped into **label blocks** delimited by a colon (`:`) and closed with `ret`.

##### <fold>Hello, World</fold>

The minimal SSL program links the standard library, defines a `main` label, writes to the `stdout` register, and flushes it:

```
#link stdlib

label main:
  set stdout "Hello, world!";
  sig flushnl;
ret;
```

`#link stdlib` imports the built-in signals. `set` loads a value into a register. `sig flushnl` calls the `flushnl` signal, which prints `stdout` and appends a newline.

##### <fold>Registers</fold>

SSL has a fixed set of named registers. Think of them as variables with reserved names.

| Register | Purpose |
|---|---|
| `a` `b` `c` | General purpose |
| `stdout` | Output buffer: write here, then call `sig flush` or `sig flushnl` |
| `stdin` | Input buffer: populated by `sig input` |
| `result` | Set by comparison instructions (`gt`, `lt`, `eq`) |
| `accumulator` | General purpose accumulator |

##### <fold>Memory Variables</fold>

You can also create named variables using bracket syntax `[name]`. They behave exactly like registers:

```
set [count] 0;
add [count] 1;
set stdout [count];
sig flushnl;
```

##### <fold>Arithmetic</fold>

`add`, `sub`, `mul`, and `div` operate **in-place** on the destination register or variable:

```
set a 7;
set [ten] 10;
mul a [ten];     % a = 70
sub a 1;         % a = 69
```

For quick expressions, inline math uses parentheses:

```
set stdout (a*b);
```

Strings can also be concatenated with `add`:

```
set stdout "Hello, ";
add stdout "world!";
sig flushnl;
```

##### <fold>Signals</fold>

Signals are the standard library calls. They operate on the registers and are invoked with `sig`:

| Signal | Description |
|---|---|
| `flushnl` | Print `stdout` with a newline, expanding `\e` as an ANSI escape |
| `flush` | Print `stdout` without a newline, expanding `\n` escape sequences |
| `input` | Pause and read a line from the user into `stdin` |
| `flush(stdin)` | Print the value of `stdin` |
| `tostr(value)` | Convert a value to a string and store it in `stdout` |
| `flusha` | Print the `a` register with `repr()` |
| `dump` | Print all register values |
| `wait` | Pause until the user presses Enter |

Signals that accept a parameter use parentheses: `sig tostr(stdout)`.

##### <fold>Labels and Control Flow</fold>

A label defines a **scoped block**. Execution enters at the label and exits at the matching `ret`:

```
label main:
  % code here
ret;
```

`jmp` jumps unconditionally to a label. `cjmp` jumps only when `result` is truthy (set by `gt`, `lt`, or `eq`):

```
label main:
  set a 5;
  gt a 3;       % result = 1 (true)
  cjmp done;
  set stdout "not reached";
  sig flushnl;
  label done:
    set stdout "a > 3";
    sig flushnl;
  ret;
ret;
```

##### <fold>Loops</fold>

Loops are written as nested labels. `hjmp` jumps back to the top of the **current** label. `chjmp` does the same but only when `result` is truthy, making it a conditional loop-back:

```
label main:
  set a 1; jmp _loop;
  label _loop:
    set stdout a;
    sig tostr(stdout);
    sig flushnl;
    add a 1;
    lt a 6;    % result = 1 while a < 6
    chjmp;     % loop back if result is truthy
  ret;
ret;
```

This prints 1 through 5. The `jmp _loop` on the first line enters the inner label from outside; without it, the label body is skipped.

##### <fold>ANSI Colours</fold>

`flushnl` expands `\e` as the escape character, so standard ANSI SGR codes work:

```
set stdout "\e[1mBold text\e[0m and normal text";
sig flushnl;
```

Common codes: `\e[1m` bold · `\e[3m` italic · `\e[31m` red · `\e[32m` green · `\e[0m` reset.

##### <fold>User Input</fold>

`sig input` pauses the program and reads a line into `stdin`. You can then work with `stdin` like any register:

```
label main:
  sig input;
  set stdout stdin;
  sig flushnl;
ret;
```

### p2pchat

p2pchat is a peer-to-peer encrypted chat network built from the ground up. It features its own packet handling on top of UDP, its message handling and encryption. <tip info="June 2026">Currently</tip> it uses a debug script with a custom library connected to send and receive messages, which is then routed through the response which sends an appropriate response. 

Architecturally, there are 2 base packet, message packets, and update packets. Message packets contain messages, edit to messages, and signals to delete messages, while update packets are used to update a group's DHT (<tip info="A table containing all previous message">Distributed Hash Table</tip>) and the list of all users. To send a message, a user first makes sure they have all the correct data, by requesting the DHT and list of users from the ratifier (the singular source to truth for all messages). If the user sees that their data is old compared to the ratifier's it will request for messages it has not received from its peers, and update itself to recover messages

After verifying it has the latest data, it sends an `mrat` message to the ratifier, asking them to verify the message. Once a positive response is received, a `msg` message is sent to all members of the group, who verify its authenticity, and add it to their own tables.

To read the full spec, you can read the project's [readme](https://github.com/DoggoofCode/p2pchat/blob/main/README.md)
 
<chat-demo></chat-demo>


### OpenMarket

[OpenMarket](https://demo.vedjaggi.com) is an indevelopment solution used to monitor multiple portfolios in one application, with the ability to read and eventually analyze different news source and the quantity of news in order to make more informed decisions about markets as well as gain a deeper understanding of your holdings and the surroudning economy.

This tool is currently in a public beta, pending release soon, with new updates shipped daily. If you find any bugs please email [bugs@vedjaggi.com](mailto:ved@vedjaggi.com)


## In-School Achievements
Head of the OFS Math Society:

* Where I presented mathematical ideas in a simple way to my peers
* Wrote an advertisement that was presented to the school 
* Help created a format for an upcoming journal

Leader of the Computer Programming Club _(CP Club)_:

* Create a campaign to advertise the Computer Programming Club
* Assisted others to teach machine learning to new students
* Taught beginners the programming language **python**, including loops, print statements and more. 

Peer mentor for 3 years, where I introduced peers to their classes and the campus, and help them understand their responsibilities as new students.

Peer tutor for 1 year, receiving the Peer Tutor Award. I assisted student in understanding the IGCSE Additional Mathematics and Extended Mathematics syllabi

Former Member of the Model United Nations _(MUN)_ Executive Team and Current MUN Student Officer _(STOFF)_ Member:

* Attended more than 25 conferences in total since 2020, <tip info="One of which was conducted internally in my institute">4 of those as a STOFF member
* Coached my peers on speech writing and conducted mock debates with new MUN members
* Was a member of an International Excursion to Taiwan to take part in a [TASMUN](https://www.tas.edu.tw/community/news/story/~board/tas-news/post/tasmun-xv-building-a-future-of-trust-and-collaboration)

## Appendix Notes

Project artifacts live here for download.

### Résumé
<resource-6 location="../resume.pdf" label="Résumé (PDF)"></resource-6>

### VAE Data
<resource-1 location="./vae/latents.json" label="Training data latent positions (JSON)"></resource-1>
<resource-2 location="./vae/model.pt" label="MNIST VAE Model (PT)"></resource-2>
<resource-4 location="./vae/inference.py" label="Model Inference Script (PY)"></resource-4>

### Custom Programming Language
<resource-5 location="../ssl/interpreter.py" label="Language Interpreter (PY)"></resource-5>
<resource-3 location="../ssl/scripts.zip" label="Simple SSL Scripts (ZIP)"></resource-3>
