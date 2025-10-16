
// Variables para el control de audio
let audioContext;
let analyser;
let microphone;
let dataArray;
let animationFrame;
let isMicActive = false;
let waveOffset = 0;
let waveHistory = []; // Historial de amplitudes para efecto de desplazamiento

// Animación de onda tipo electrocardiograma/latido con curvas suaves
function animateHeartbeatWave() {
    const heartbeatLine = document.getElementById('heartbeat-line');
    
    // Obtener amplitud del audio en tiempo real
    let currentAmplitude = 0;
    if (isMicActive) {
        const rms = getRMS();
        currentAmplitude = rms * 80; // Amplitud reactiva al sonido (0-80px)
    } else {
        // Sin micrófono, crear un latido simulado
        currentAmplitude = Math.abs(Math.sin(waveOffset * 0.02)) * 30;
    }
    
    // Agregar la amplitud actual al historial
    waveHistory.push(currentAmplitude);
    
    // Mantener solo los últimos valores necesarios para llenar la pantalla
    const maxPoints = 80;
    if (waveHistory.length > maxPoints) {
        waveHistory.shift();
    }
    
    // Generar el path de la onda con curvas suaves (Bézier)
    let path = 'M 0 100';
    const spacing = 1200 / maxPoints; // Espaciado entre puntos
    
    for (let i = 0; i < waveHistory.length; i++) {
        const x = i * spacing;
        const amplitude = waveHistory[i];
        
        // Alternar entre positivo y negativo para efecto de onda
        const direction = Math.sin(i * 0.5) > 0 ? 1 : -1;
        const y = 100 + (amplitude * direction);
        
        if (i === 0) {
            path += ` L ${x} ${y}`;
        } else {
            // Usar curvas cuadráticas para suavizar
            const prevX = (i - 1) * spacing;
            const prevAmplitude = waveHistory[i - 1];
            const prevDirection = Math.sin((i - 1) * 0.5) > 0 ? 1 : -1;
            const prevY = 100 + (prevAmplitude * prevDirection);
            
            // Punto de control en el medio
            const cpX = (prevX + x) / 2;
            const cpY = (prevY + y) / 2;
            
            path += ` Q ${cpX} ${cpY}, ${x} ${y}`;
        }
    }
    
    // Completar el resto del path hasta el final con curva suave
    if (waveHistory.length < maxPoints) {
        const lastX = waveHistory.length * spacing;
        path += ` Q ${(lastX + 1200) / 2} 100, 1200 100`;
    }
    
    heartbeatLine.setAttribute('d', path);
    
    waveOffset++;
    requestAnimationFrame(animateHeartbeatWave);
}

// Respiración del hexágono por defecto
let breatheAnimation = anime({
    targets: '#hexagon',
    scale: [1, 1.2, 1],
    duration: 3500,
    easing: 'easeInOutSine',
    loop: true
});

// Función para inicializar el micrófono
async function initMicrophone() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.8;
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        
        microphone.connect(analyser);
        
        isMicActive = true;
        breatheAnimation.pause();
        updateHexagon();
    } catch (error) {
        console.log('Micrófono no disponible, usando animación por defecto');
    }
}

// Función para calcular RMS con suavizado
function getRMS() {
    analyser.getByteTimeDomainData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        const normalized = (dataArray[i] - 128) / 128;
        sum += normalized * normalized;
    }
    return Math.sqrt(sum / dataArray.length);
}

// Variables para suavizado
let currentScale = 1;
let targetScale = 1;

// Función para actualizar el hexágono con suavizado
function updateHexagon() {
    if (!isMicActive) return;

    const rms = getRMS();
    targetScale = 1 + (rms * 1.8); // Escala entre 1 y 2.8 (aún más grande)
    
    // Suavizado (lerp)
    currentScale += (targetScale - currentScale) * 0.15;
    
    const hexagon = document.getElementById('hexagon');
    hexagon.style.transform = `rotate(8deg) scale(${currentScale})`;
    hexagon.style.transition = 'transform 0.2s ease-out';

    animationFrame = requestAnimationFrame(updateHexagon);
}

// Iniciar animaciones
animateHeartbeatWave();
initMicrophone();

// Limpiar al salir
window.addEventListener('beforeunload', () => {
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
    }
    if (audioContext) {
        audioContext.close();
    }
});
