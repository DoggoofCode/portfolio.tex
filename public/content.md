## Abstract

I am especially interested in AI-driven experiences and the mathematics behind them, and I like learning those concepts by rebuilding them in code through data visualizations and interactive models.

Keywords: machine learning, transformers, data visualization, front-end engineering, mathematics.

## Focus Areas

Finding the intersection between mathematics and machine learning through recreation models, such as transformers, quick and high-fidelty prototyping of AI models, and learning new mathematical concepts through code

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

Within this project I used a VAE _(Variational Autoencoder)_ to create synthetic data of numbers and fruits. VAE's take complex data and distills it into the simpler building blocks, for example, the tilt of the character or the position of the character. All of this data is put into a _latent space_, which can be thought of as a smaller image, or a point in a higher dimensional space. As you put more points in this space, the model slowly begins to put similar inputs closer, and different inputs farther apart in this space (i.e. images of the digit one closer to eachother, while images of the digit eight farther apart from the previous images).

<vae-structure-demo></vae-structure-demo>

> Each point is a unique image, represented by 20 different sliders. This visualization compacts those 20 dimensions into a 2d space, as shown. See all position data at the [Appendix](#appendix)

#### Applications

Synthetic data from VAEs are incredibly useful models that can generate synthetic data for models. To generate synthetic data, similar which to a source image, a VAE should be used to encode it into the latent space. Then, within the latent space, the point can be moved and shifted slightly. After decoding the image, the output is a slightly shifted but similar image to what went in.

This process can be adapted for more than one image. To merge two images, you need the point in space which the two images inhabit, then draw a line between them. Each point in that line represents a unique combination of the two source images, Moreover, the line's midpoint represents a combination of the two images

![An interpolation between digits 1 and 8](./vae_content/interpolation_8_to_7.png)
> An interpolation between digits 1 and 8

#### Running the model
You can run the VAE by downlaoding the model in the [appendix](#appendix/), and can be used for decoding saved latents and merging 5 of the same digit into one.

To start make sure that you have python installed on your computer and run `pip install torch torchvision`. Also make sure that you have downloaded model.pt, latents.json, and inference.py in the appendix. Then at the top of inference.py, you will see: 

```python
GOAL = "generate data" # Can you choose between "output image" or "generate data"
MODEL_PATH = "path/to/model.pt"
IMAGE_PATH = "path/to/output_image.png"
LATENTS_PATH = "path/to/latents.json"
```
You can either generate data, which takes 5 of the same digit and outputs new data of their combination, or output an image, which decodes one of the latents of a choosen image stored in latents.json. Afterwards, remember to change the path of the model, latents and output_file based on your system.

### Custom Programming Language

I created a custom assembly-like programming language called `ssl` _(Simple Scripting Language)_, with an operator-operand style language for scripting. The project originally started as an off shoot of [p2pchat](https://github.com/DoggoofCode/p2pchat). 

#### Interpreter Architecture 

The interpreter is broken up into 5 main stages, the resolver which finds and resolves import statemtents from python and ssl. Next the tokenizer _(which contains both the lexer and the tokenizer)_ breaks down the code into logical pieces then assigns them a token based on their type _(e.g. literal, keyword and identifier)_. It then finds all the labels, essentially how functions and loops are defined, and creates a tree to ensure scoping is enforced. Afterwards, the generated AST is executed.

#### Langage Tutorial
Under Construction!

<programming-demo></programming-demo>

## In-School Achievements
Under Construction!

## Appendix Notes

Project artifacts live here for download.

### VAE Data
<resource-1 location="./vae/latents.json" label="Training data latent positions (JSON)"></resource-1>
<resource-2 location="./vae/model.pt" label="MNIST VAE Model (PT)"></resource-2>
<resource-4 location="./vae/inference.py" label="Model Inference Script (PY)"></resource-4>

### Custom Programming Language
<resource-5 location="../ssl/interpreter.py" label="Language Interpreter (PY)"></resource-5>
<resource-3 location="../ssl/scripts.zip" label="Simple SSL Scripts (ZIP)"></resource-3>
