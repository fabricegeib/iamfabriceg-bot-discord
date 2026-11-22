const { request } = require("../http");
const { NotFoundError } = require("../errors");

const BASE = "https://pokeapi.co/api/v2";
const HOUR = 60 * 60 * 1000;

const normalize = (value) =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");

async function fetchJson(path) {
  try {
    return await request(`${BASE}${path}`, { cacheTtlMs: HOUR, retries: 1 });
  } catch (error) {
    if (error.status === 404) throw new NotFoundError("Ce Pokémon est introuvable dans le Pokédex.");
    throw error;
  }
}

function mapPokemon(data, species) {
  const artwork =
    data.sprites?.other?.["official-artwork"]?.front_default ||
    data.sprites?.other?.home?.front_default ||
    data.sprites?.front_default;

  const frenchName = species?.names?.find((entry) => entry.language.name === "fr")?.name;
  const flavor = species?.flavor_text_entries?.find((entry) => entry.language.name === "fr")?.flavor_text;
  const genera = species?.genera?.find((entry) => entry.language.name === "fr")?.genus;

  return {
    id: data.id,
    name: data.name,
    displayName: frenchName || data.name,
    height: data.height / 10,
    weight: data.weight / 10,
    artwork,
    sprite: data.sprites?.front_default,
    types: data.types.map((slot) => slot.type.name),
    abilities: data.abilities.map((slot) => slot.ability.name),
    stats: data.stats.map((slot) => ({ name: slot.stat.name, value: slot.base_stat })),
    genus: genera,
    description: flavor?.replace(/\f|\n/g, " ").replace(/\s+/g, " ").trim(),
    speciesUrl: `https://pokemon.com/us/pokedex/${data.name}`,
  };
}

/** Récupère un Pokémon par nom ou numéro, avec sa fiche française. */
async function getPokemon(query) {
  const key = normalize(query);
  if (!key) throw new NotFoundError("Indiquez un nom ou un numéro de Pokémon.");

  const data = await fetchJson(`/pokemon/${encodeURIComponent(key)}`);
  let species;
  try {
    species = await fetchJson(`/pokemon-species/${data.id}`);
  } catch {
    // La fiche espèce est optionnelle : on garde les données de base.
  }
  return mapPokemon(data, species);
}

/** Pokémon aléatoire (générations 1 à 9). */
async function getRandomPokemon() {
  const id = 1 + Math.floor(Math.random() * 1025);
  return getPokemon(String(id));
}

module.exports = { getPokemon, getRandomPokemon, mapPokemon, BASE };
