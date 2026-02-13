const FUN_FACTS = [
    "🗻 Mt. Fuji is 3,776 meters tall — that's like stacking 7 Eiffel Towers!",
    "🚄 The Shinkansen goes 320 km/h and is almost never late!",
    "🦌 Over 1,000 friendly deer roam freely in Nara Park.",
    "🍣 Sushi originally started as a way to preserve fish with rice.",
    "⛩️ There are over 80,000 shrines in Japan!",
    "🐒 Snow monkeys in Nagano love taking hot spring baths.",
    "🎌 The Japanese flag is called 'Nisshōki' — Circle of the Sun.",
    "🏯 Himeji Castle is called the White Heron Castle because of its shape.",
    "🍜 Ramen shops in Japan often have vending machines to order food !",
    "🌸 Cherry blossom season lasts only about 2 weeks!",
    "🎋 On Tanabata, people write wishes on paper and hang them on bamboo.",
    "🐙 Takoyaki (octopus balls) were invented in Osaka in 1935!",
    "🗼 Tokyo Tower is painted white and orange to meet air safety rules.",
    "🎎 There are over 300 varieties of Kit-Kat flavors in Japan!",
    "🏔️ Japan has 111 active volcanoes — about 10% of the world's total!"
];

export default function LoadingScreen() {
    const fact = FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)];

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-indigo-100 p-8 text-center">
            {/* Spinning torii gate */}
            <div className="mb-8 animate-bounce text-7xl">⛩️</div>

            <h2 className="mb-4 text-2xl font-extrabold text-brand-blue">Loading your adventure...</h2>

            <div className="mb-8 max-w-sm rounded-2xl bg-white/80 p-6 shadow-lg ring-1 ring-brand-blue/10 backdrop-blur">
                <p className="text-sm font-bold text-brand-blue/60 mb-1">Did you know?</p>
                <p className="text-lg text-gray-700 leading-relaxed">{fact}</p>
            </div>

            {/* Pulse dots */}
            <div className="flex gap-2">
                {[0, 1, 2].map(i => (
                    <div
                        key={i}
                        className="h-3 w-3 rounded-full bg-brand-blue animate-pulse"
                        style={{ animationDelay: `${i * 200}ms` }}
                    />
                ))}
            </div>
        </div>
    );
}
