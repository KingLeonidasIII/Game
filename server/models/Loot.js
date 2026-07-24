const LOOT_TYPES = {
  health_potion: {
    name: 'Health Potion',
    type: 'consumable',
    effect: 'heal',
    value: 30,
    sprite: 'health_potion',
    color: '#ff4444'
  },
  mana_potion: {
    name: 'Mana Potion',
    type: 'consumable',
    effect: 'mana',
    value: 30,
    sprite: 'mana_potion',
    color: '#4444ff'
  },
  gold: {
    name: 'Gold',
    type: 'currency',
    value: 10,
    sprite: 'gold',
    color: '#ffd700'
  },
  sword: {
    name: 'Sword',
    type: 'weapon',
    attackBonus: 5,
    sprite: 'sword',
    color: '#aaaaaa'
  },
  shield: {
    name: 'Shield',
    type: 'armor',
    defenseBonus: 3,
    sprite: 'shield',
    color: '#888888'
  },
  staff: {
    name: 'Staff',
    type: 'weapon',
    attackBonus: 8,
    manaBonus: 10,
    sprite: 'staff',
    color: '#6644ff'
  },
  bow: {
    name: 'Bow',
    type: 'weapon',
    attackBonus: 6,
    sprite: 'bow',
    color: '#8B4513'
  }
};

class Loot {
  constructor(id, type, x, y) {
    this.id = id;
    this.type = type;
    this.x = x;
    this.y = y;
    
    const lootData = LOOT_TYPES[type] || LOOT_TYPES.gold;
    this.name = lootData.name;
    this.sprite = lootData.sprite;
    this.color = lootData.color;
    this.value = lootData.value || 0;
    this.attackBonus = lootData.attackBonus || 0;
    this.defenseBonus = lootData.defenseBonus || 0;
    this.manaBonus = lootData.manaBonus || 0;
    this.consumable = lootData.type === 'consumable';
  }

  getData() {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      x: this.x,
      y: this.y,
      sprite: this.sprite,
      color: this.color,
      value: this.value,
      attackBonus: this.attackBonus,
      defenseBonus: this.defenseBonus,
      manaBonus: this.manaBonus,
      consumable: this.consumable
    };
  }
}

module.exports = Loot;
