
const canvas = document.getElementById("heroGraph");

if (canvas) {
    const ctx = canvas.getContext("2d");

    const width = canvas.width;
    const height = canvas.height;

    let time = 0;

    function drawGrid() {
        ctx.strokeStyle = "#21262d";
        ctx.lineWidth = 1;

        for (let x = 0; x <= width; x += 50) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        for (let y = 0; y <= height; y += 25) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        ctx.strokeStyle = "#484f58";

        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(width / 2, 0);
        ctx.lineTo(width / 2, height);
        ctx.stroke();
    }

    function drawFunction(func, color) {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;

        for (let x = 0; x <= width; x++) {
            const angle = (x - width / 2) / 65;
            const y = height / 2 - func(angle + time) * 65;

            if (x === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }

        ctx.stroke();
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);

        drawGrid();

        drawFunction(Math.sin, "#58a6ff");
        drawFunction(Math.cos, "#a78bfa");

        time += 0.015;

        requestAnimationFrame(animate);
    }

    animate();
}
