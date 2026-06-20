tailwind.config = {
    darkMode: "class",
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Orbitron', 'sans-serif'],
            },
            colors: {
                primary: "#3b82f6",
                secondary: "#8b5cf6",
                accent: "#06b6d4",
                dark: "#0f172a",
                surface: "#1e293b",
                "surface-accent": "#334155"
            },
            boxShadow: {
                '3d-blue': '0 10px 30px -10px rgba(59, 130, 246, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.1)',
                '3d-purple': '0 10px 30px -10px rgba(139, 92, 246, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.1)',
                'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
            }
        }
    }
}
