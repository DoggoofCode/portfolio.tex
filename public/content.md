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

<demo-1></demo-1>

> Each point is a unique image, represented by 20 different sliders. This visualization compacts those 20 dimensions into a 2d space, as shown. 

#### Applications

Synthetic data from VAEs are incredibly useful models that can generate synthetic data for models. To generate synthetic data, similar which to a source image, a VAE should be used to encode it into the latent space. Then, within the latent space, the point can be moved and shifted slightly. After decoding the image, the output is a slightly shifted but similar image to what went in.

This process can be adapted for more than one image. To merge two images, you need the point in space which the two images inhabit, then draw a line between them. Each point in that line represents a unique combination of the two source images, Moreover, the line's midpoint represents a combination of the two images


> An interpolation between digits 1 and 8

## In-School Achievements
Hello world!

## Appendix Notes

Project artifacts live here for download.

### Typograph Artifacts
<resource-1 location="typograph/typograph-case-study.pdf" label="Typograph case study (PDF)"></resource-1>
<resource-2 location="typograph/typograph-wireframes.zip" label="Typograph wireframes (ZIP)"></resource-2>

### Arcfield Artifacts
<resource-3 location="testdir/test.html" label="Arcfield metrics report (PDF)"></resource-3>
