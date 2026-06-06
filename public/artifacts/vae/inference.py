import torch
import torch.nn as nn
from torchvision.utils import save_image
from json import load

GOAL = "generate data" # Can you choose between "output image" or "generate data"
MODEL_PATH = "path/to/model.pt"
IMAGE_PATH = "path/to/output_image.png"
LATENTS_PATH = "path/to/latents.json"

class VAE(nn.Module):
    def __init__(
        self,
        input_dim: int = 784,
        hidden_dim: int = 400,
        latent_dim: int = 20,
    ):
        super().__init__()
        self.latent_dim = latent_dim

        self.encoder = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
        )
        self.fc_mu = nn.Linear(hidden_dim, latent_dim)  # mean
        self.fc_log_var = nn.Linear(hidden_dim, latent_dim)  # log variance

        self.decoder = nn.Sequential(
            nn.Linear(latent_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, input_dim),
            nn.Sigmoid(),  # pixel values in [0, 1]
        )

    def encode(self, x: torch.Tensor):
        h = self.encoder(x)
        mu = self.fc_mu(h)
        log_var = self.fc_log_var(h)
        return mu, log_var

    def reparameterize(self, mu: torch.Tensor, log_var: torch.Tensor) -> torch.Tensor:
        if self.training:
            std = torch.exp(0.5 * log_var)
            eps = torch.randn_like(std)
            return mu + eps * std
        return mu

    def decode(self, z: torch.Tensor) -> torch.Tensor:
        return self.decoder(z)

    def forward(self, x: torch.Tensor):
        mu, log_var = self.encode(x)
        z = self.reparameterize(mu, log_var)
        x_recon = self.decode(z)
        return x_recon, mu, log_var

    @torch.no_grad()
    def sample(self, n: int = 64, device="cpu") -> torch.Tensor:
        z = torch.randn(n, self.latent_dim, device=device)
        return self.decode(z)


model = VAE()
model.load_state_dict(torch.load(MODEL_PATH, weights_only=True))
model.eval()
digit_type = input("Which digit would you like to output?: ")
with open(LATENTS_PATH, "r") as f:
    latents = load(f)
if not digit_type.isnumeric() or not (len(digit_type) == 1):
    exit()
if GOAL == "output image":
    outputed = False
    for lt in latents:
        if lt["label"] != int(digit_type) or outputed:
            continue
        fig = torch.Tensor(lt["z"])
        save_image(model.decode(fig).view(1, 28, 28), IMAGE_PATH)
        outputed = True
elif GOAL == "generate data":
    five_lts = None
    print(five_lts)
    lts = 0
    for lt in latents:
        if lt["label"] != int(digit_type) or lts > 4:
            continue
        latent = torch.Tensor(lt["z"]).view(20, 1)
        if five_lts is not None:
            five_lts = torch.cat((five_lts, latent), dim=1)
        else:
            five_lts = latent
        lts += 1
    if five_lts is None:
        exit()
    sum = torch.sum(five_lts, 1)/5
    save_image(model.decode(sum).view(1, 28, 28), IMAGE_PATH)

else:
    print("UNRECOGNIZED GOAL, PLEASE CHANGE GOAL")
