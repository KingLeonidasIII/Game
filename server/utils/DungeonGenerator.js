/**
 * Dungeon Generator using Binary Space Partitioning (BSP)
 * Generates a dungeon with rooms and corridors
 */
class DungeonGenerator {
  static generate(width, height) {
    // Ensure odd dimensions for proper splitting
    width = Math.floor(width / 2) * 2 + 1;
    height = Math.floor(height / 2) * 2 + 1;

    // Initialize grid (0 = floor, 1 = wall)
    const grid = Array(height).fill().map(() => Array(width).fill(1));

    // Create a leaf for the entire dungeon
    const rootLeaf = {
      x: 0,
      y: 0,
      width: width,
      height: height,
      leftChild: null,
      rightChild: null,
      room: null
    };

    // Split the dungeon into leaves
    const leaves = this.splitLeaf(rootLeaf, 3);

    // Create rooms in some leaves
    leaves.forEach(leaf => {
      if (leaf.width > 3 && leaf.height > 3 && Math.random() > 0.3) {
        leaf.room = this.createRoom(leaf);
        this.drawRoom(grid, leaf.room);
      }
    });

    // Connect rooms with corridors
    this.connectLeaves(leaves, grid);

    // Place stairs at the start and end
    this.placeStairs(grid, leaves);

    return {
      width: width * 32, // Convert to pixels (32px per tile)
      height: height * 32,
      grid: grid,
      rooms: leaves.filter(leaf => leaf.room).map(leaf => leaf.room)
    };
  }

  static splitLeaf(leaf, maxDepth) {
    // Stop splitting if max depth reached or leaf is too small
    if (maxDepth <= 0 || leaf.width < 5 || leaf.height < 5) {
      return [leaf];
    }

    // Randomly split horizontally or vertically
    const splitHorizontally = Math.random() > 0.5;
    const splitPosition = splitHorizontally
      ? Math.floor(leaf.height / 2)
      : Math.floor(leaf.width / 2);

    // Create child leaves
    if (splitHorizontally) {
      leaf.leftChild = {
        x: leaf.x,
        y: leaf.y,
        width: leaf.width,
        height: splitPosition,
        leftChild: null,
        rightChild: null,
        room: null
      };
      leaf.rightChild = {
        x: leaf.x,
        y: leaf.y + splitPosition + 1,
        width: leaf.width,
        height: leaf.height - splitPosition - 1,
        leftChild: null,
        rightChild: null,
        room: null
      };
    } else {
      leaf.leftChild = {
        x: leaf.x,
        y: leaf.y,
        width: splitPosition,
        height: leaf.height,
        leftChild: null,
        rightChild: null,
        room: null
      };
      leaf.rightChild = {
        x: leaf.x + splitPosition + 1,
        y: leaf.y,
        width: leaf.width - splitPosition - 1,
        height: leaf.height,
        leftChild: null,
        rightChild: null,
        room: null
      };
    }

    // Recursively split children
    const leftLeaves = this.splitLeaf(leaf.leftChild, maxDepth - 1);
    const rightLeaves = this.splitLeaf(leaf.rightChild, maxDepth - 1);
    return [...leftLeaves, ...rightLeaves];
  }

  static createRoom(leaf) {
    // Room dimensions (at least 3x3, at most leaf size - 2)
    const roomWidth = Math.max(3, Math.floor(leaf.width * 0.6));
    const roomHeight = Math.max(3, Math.floor(leaf.height * 0.6));
    
    // Room position (centered in leaf)
    const roomX = leaf.x + Math.floor((leaf.width - roomWidth) / 2);
    const roomY = leaf.y + Math.floor((leaf.height - roomHeight) / 2);

    return {
      x: roomX,
      y: roomY,
      width: roomWidth,
      height: roomHeight,
      centerX: roomX + Math.floor(roomWidth / 2),
      centerY: roomY + Math.floor(roomHeight / 2)
    };
  }

  static drawRoom(grid, room) {
    for (let y = room.y; y < room.y + room.height; y++) {
      for (let x = room.x; x < room.x + room.width; x++) {
        if (x >= 0 && x < grid[0].length && y >= 0 && y < grid.length) {
          grid[y][x] = 0; // Floor
        }
      }
    }
  }

  static connectLeaves(leaves, grid) {
    // Get all leaves with rooms
    const roomLeaves = leaves.filter(leaf => leaf.room);
    
    // Connect each room to another room
    for (let i = 0; i < roomLeaves.length - 1; i++) {
      const roomA = roomLeaves[i].room;
      const roomB = roomLeaves[i + 1].room;
      
      this.drawCorridor(grid, roomA.centerX, roomA.centerY, roomB.centerX, roomB.centerY);
    }
  }

  static drawCorridor(grid, x1, y1, x2, y2) {
    // Horizontal then vertical corridor
    const cornerX = x2;
    const cornerY = y1;

    // Draw horizontal line
    for (let x = Math.min(x1, cornerX); x <= Math.max(x1, cornerX); x++) {
      if (x >= 0 && x < grid[0].length && y1 >= 0 && y1 < grid.length) {
        grid[y1][x] = 0;
      }
    }

    // Draw vertical line
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
      if (cornerX >= 0 && cornerX < grid[0].length && y >= 0 && y < grid.length) {
        grid[y][cornerX] = 0;
      }
    }
  }

  static placeStairs(grid, leaves) {
    if (leaves.length === 0) return;

    // Place stairs at the start (first room)
    const firstRoom = leaves.find(leaf => leaf.room);
    if (firstRoom && firstRoom.room) {
      const room = firstRoom.room;
      if (room.width >= 3 && room.height >= 3) {
        grid[room.y + 1][room.x + 1] = 2; // Stairs down (2)
      }
    }

    // Place stairs at the end (last room)
    const lastRoom = leaves[leaves.length - 1];
    if (lastRoom && lastRoom.room) {
      const room = lastRoom.room;
      if (room.width >= 3 && room.height >= 3) {
        grid[room.y + room.height - 2][room.x + room.width - 2] = 3; // Stairs up (3)
      }
    }
  }
}

module.exports = DungeonGenerator;
