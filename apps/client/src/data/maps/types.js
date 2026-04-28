export function genCollision(w, h, walls) {
    const grid = Array.from({ length: h }, () => new Array(w).fill(0));
    for (let x = 0; x < w; x++) {
        grid[0][x] = 1;
        grid[h - 1][x] = 1;
    }
    for (let y = 0; y < h; y++) {
        grid[y][0] = 1;
        grid[y][w - 1] = 1;
    }
    for (const wall of walls) {
        for (let yy = wall.y; yy < wall.y + wall.h; yy++) {
            for (let xx = wall.x; xx < wall.x + wall.w; xx++) {
                if (grid[yy] && grid[yy][xx] !== undefined)
                    grid[yy][xx] = 1;
            }
        }
    }
    return grid;
}
