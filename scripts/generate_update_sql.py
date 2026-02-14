
import json

topics = [
    {
        "title": "Take Off Your Shoes",
        "description": "Shoes off by the door",
        "intro": "Kai went into a house in Japan and saw shoes by the door. In Japan, it is important to take off your outdoor shoes before entering a home!",
        "question": "What should Kai do next?",
        "options": [
            {"id": "1", "text": "Take off his shoes by the door", "is_correct": True},
            {"id": "2", "text": "Put his shoes on the table", "is_correct": False},
            {"id": "3", "text": "Wear his shoes inside", "is_correct": False}
        ]
    },
    {
        "title": "Indoor Slippers",
        "description": "Wear slippers inside",
        "intro": "Mia saw slippers in a basket near the entrance. These are for guests to wear inside so their feet stay warm and the house stays clean!",
        "question": "Why are slippers there?",
        "options": [
            {"id": "1", "text": "To wear inside the house", "is_correct": True},
            {"id": "2", "text": "To wear in the bath", "is_correct": False},
            {"id": "3", "text": "To wear outside in the rain", "is_correct": False}
        ]
    },
    {
        "title": "Before We Eat: Itadakimasu",
        "description": "Say Itadakimasu",
        "intro": "Before eating, Yuki's family says **Itadakimasu** (Ee-tah-dah-KEE-mahs). It means 'I gratefully receive this food.'",
        "question": "When do people often say Itadakimasu?",
        "options": [
            {"id": "1", "text": "Before eating", "is_correct": True},
            {"id": "2", "text": "Before sleeping", "is_correct": False},
            {"id": "3", "text": "Before brushing teeth", "is_correct": False}
        ]
    },
    {
        "title": "Thank You: Arigatou",
        "description": "Say Arigatou",
        "intro": "After dinner, Ben says **Arigatou** (Ah-REE-gah-toh). This is a polite way to say thank you to the chef and the family.",
        "question": "What does Arigatou mean?",
        "options": [
            {"id": "1", "text": "Thank you", "is_correct": True},
            {"id": "2", "text": "Excuse me", "is_correct": False},
            {"id": "3", "text": "Goodbye", "is_correct": False}
        ]
    },
    {
        "title": "Quiet on the Train",
        "description": "Talk softly on trains",
        "intro": "On a train, Hana noticed most people were quiet. Trains in Japan are quiet places so everyone can relax or read peacefully.",
        "question": "What is a good choice on many trains in Japan?",
        "options": [
            {"id": "1", "text": "Talk softly", "is_correct": True},
            {"id": "2", "text": "Play music out loud", "is_correct": False},
            {"id": "3", "text": "Run in the aisle", "is_correct": False}
        ]
    },
    {
        "title": "Two Hands for Respect",
        "description": "Giving and receiving with two hands",
        "intro": "At a store, Sora handed money with two hands. Using both hands shows that you are giving something with care and respect.",
        "question": "What does using two hands often show?",
        "options": [
            {"id": "1", "text": "Respect", "is_correct": True},
            {"id": "2", "text": "Boredom", "is_correct": False},
            {"id": "3", "text": "Anger", "is_correct": False}
        ]
    },
    {
        "title": "Wait Your Turn",
        "description": "Taking turns",
        "intro": "In a classroom, Aki took turns speaking. In Japan, waiting for your turn is a great way to show you are a good friend and listener.",
        "question": "What is a good group rule?",
        "options": [
            {"id": "1", "text": "Wait your turn", "is_correct": True},
            {"id": "2", "text": "Grab the mic", "is_correct": False},
            {"id": "3", "text": "Shout answers", "is_correct": False}
        ]
    },
    {
        "title": "No Snacks on Trains",
        "description": "Waiting to eat",
        "intro": "Rin saw a sign that said 'No eating' on the train. Most people wait until they are off the train or at a station to eat their snacks.",
        "question": "What should Rin do?",
        "options": [
            {"id": "1", "text": "Wait to eat later", "is_correct": True},
            {"id": "2", "text": "Eat a big meal now", "is_correct": False},
            {"id": "3", "text": "Drop crumbs on the floor", "is_correct": False}
        ]
    },
    {
        "title": "The Water Station",
        "description": "Cleaning hands at temples",
        "intro": "At a shrine, Ken washed his hands at a water station called a Temizuya. This is to be clean and prepared before entering.",
        "question": "Why do people wash hands at shrines?",
        "options": [
            {"id": "1", "text": "To be clean and respectful", "is_correct": True},
            {"id": "2", "text": "To cool off a phone", "is_correct": False},
            {"id": "3", "text": "To dry their shoes", "is_correct": False}
        ]
    },
    {
        "title": "Excuse Me: Sumimasen",
        "description": "Say Sumimasen",
        "intro": "At a restaurant, Emi says **Sumimasen** (Sue-mee-MAH-sen) to get a waiter's attention. It means 'Excuse me.'",
        "question": "Why might Emi say Sumimasen?",
        "options": [
            {"id": "1", "text": "To get attention politely", "is_correct": True},
            {"id": "2", "text": "To say 'Happy birthday'", "is_correct": False},
            {"id": "3", "text": "To say 'I am sleepy'", "is_correct": False}
        ]
    },
    {
        "title": "Finished Eating: Gochisousama",
        "description": "Say Gochisousama",
        "intro": "After eating, Taro says **Gochisousama** (Go-chee-SOH-sah-mah). It means 'Thank you for the feast!'",
        "question": "When do people often say Gochisousama?",
        "options": [
            {"id": "1", "text": "After eating", "is_correct": True},
            {"id": "2", "text": "Before eating", "is_correct": False},
            {"id": "3", "text": "Before a test", "is_correct": False}
        ]
    },
    {
        "title": "Good Morning: Ohayou",
        "description": "Say Ohayou in the morning",
        "intro": "In the morning, Aya says **Ohayou** (Oh-HAH-yoh). It's a sunshine-filled way to start the day with family and friends!",
        "question": "When do people often say Ohayou?",
        "options": [
            {"id": "1", "text": "In the morning", "is_correct": True},
            {"id": "2", "text": "At night", "is_correct": False},
            {"id": "3", "text": "At a wedding", "is_correct": False}
        ]
    },
    {
        "title": "Good Evening: Konbanwa",
        "description": "Say Konbanwa at night",
        "intro": "When the sun goes down and the moon comes out, Koji says **Konbanwa** (Kon-bahn-wah). It means 'Good evening.'",
        "question": "What does Konbanwa mean?",
        "options": [
            {"id": "1", "text": "Good evening", "is_correct": True},
            {"id": "2", "text": "Good morning", "is_correct": False},
            {"id": "3", "text": "Goodbye", "is_correct": False}
        ]
    },
    {
        "title": "I'm Sorry: Gomen Nasai",
        "description": "Say Gomen Nasai",
        "intro": "Nina accidentally bumped into someone and said **Gomen nasai** (Go-men nah-SAI). It's a polite way to say 'I'm sorry.'",
        "question": "What does Gomen nasai mean?",
        "options": [
            {"id": "1", "text": "I'm sorry", "is_correct": True},
            {"id": "2", "text": "Thank you", "is_correct": False},
            {"id": "3", "text": "Hello", "is_correct": False}
        ]
    },
    {
        "title": "Quiet at the Temple",
        "description": "Using a quiet voice",
        "intro": "A sign at the temple says 'Quiet please.' Temples are peaceful places for people to think and be calm.",
        "question": "What should you do there?",
        "options": [
            {"id": "1", "text": "Use a quiet voice", "is_correct": True},
            {"id": "2", "text": "Play a loud game", "is_correct": False},
            {"id": "3", "text": "Yell and clap loudly", "is_correct": False}
        ]
    },
    {
        "title": "A Polite Bow",
        "description": "Bowing for respect",
        "intro": "In Japan, Leo saw people bow a little when greeting. A small bow (Ojigi) shows that you are happy to see someone and respect them.",
        "question": "What can a small bow show?",
        "options": [
            {"id": "1", "text": "Respect", "is_correct": True},
            {"id": "2", "text": "Sleepiness", "is_correct": False},
            {"id": "3", "text": "Hunger", "is_correct": False}
        ]
    },
    {
        "title": "The Green Light",
        "description": "Waiting for the walk sign",
        "intro": "At a crosswalk, Mika waited even though no cars were coming. Waiting for the light is a safe and polite way to follow rules in Japan.",
        "question": "What is Mika doing?",
        "options": [
            {"id": "1", "text": "Following the rules", "is_correct": True},
            {"id": "2", "text": "Trying to race", "is_correct": False},
            {"id": "3", "text": "Playing tag", "is_correct": False}
        ]
    },
    {
        "title": "Trash in the Bin",
        "description": "Sorting trash",
        "intro": "At a park, Haru put his trash in the right bin. In Japan, everyone helps keep public places clean by sorting their recycling.",
        "question": "Why sort trash?",
        "options": [
            {"id": "1", "text": "To keep places clean", "is_correct": True},
            {"id": "2", "text": "To make more noise", "is_correct": False},
            {"id": "3", "text": "To hide toys", "is_correct": False}
        ]
    },
    {
        "title": "Stay with the Group",
        "description": "Group safety",
        "intro": "On a school trip, Mei stayed close to her group. Staying together makes sure everyone is safe and no one gets lost!",
        "question": "What is a safe choice?",
        "options": [
            {"id": "1", "text": "Stay with your group", "is_correct": True},
            {"id": "2", "text": "Run far ahead alone", "is_correct": False},
            {"id": "3", "text": "Hide from adults", "is_correct": False}
        ]
    },
    {
        "title": "Please: Onegaishimasu",
        "description": "Saying Onegaishimasu",
        "intro": "At a café, a kid says **Onegaishimasu** (Oh-neh-gai-shee-MAH-s) when ordering. It's a special way to say 'Please.'",
        "question": "When might someone say Onegaishimasu?",
        "options": [
            {"id": "1", "text": "When asking politely", "is_correct": True},
            {"id": "2", "text": "When telling a joke", "is_correct": False},
            {"id": "3", "text": "When saying goodbye", "is_correct": False}
        ]
    }
]

level_ids = [
    "06a0cc91-9170-4d2b-b971-5f3a42997b68",
    "85bb7a03-72a4-4ed3-b820-f4c476dc1bc4",
    "db8c5d08-7759-41d9-a497-672a51fcfe81",
    "cb29f093-1acf-400c-a07a-6d52d0386af2",
    "e821aea3-7877-4eba-9abb-0ce60c0081b2",
    "09f4f9f2-794c-40aa-b046-68fb51f28c34",
    "0be66486-c1ad-4b4a-8e5b-4db3a7f01665",
    "1ad26e56-0cfa-49f6-8c99-38ce0f99d541",
    "28035c22-4ca7-4b90-b595-c58db2011dbf",
    "92869818-c713-4e8c-9a80-bd4d3e33e37b",
    "ab6e1063-5ac5-4312-8384-af5ae60de2f9",
    "0aad1988-2a78-40cc-9e0f-fc10a79209a9",
    "a5cb8971-bf6e-452b-a501-b3a23a09bd1e",
    "91b56893-0f15-46c8-adf3-4ce0e6bff0fc",
    "fffa96e2-6be0-49d8-b01f-08195c7eba23",
    "e0813911-0b66-4453-afea-a34b59dd1932",
    "b87845fc-7f20-4403-9ca1-cbe0fa6d3df6",
    "174dea05-480c-4832-b1f8-8fcf687e0048",
    "632a565b-359b-4f59-802d-21639f330185",
    "1635b324-36b3-41ae-bd7a-1bc73a5886b6"
]

lesson_ids = [
    "efccb2f5-d848-484d-acfa-e2cd5567f15a",
    "6f1d036b-32ce-4ab3-a0b1-dd66d4202004",
    "40acd529-f220-449a-83df-4c0f3f67c930",
    "d2379d45-0ffa-452f-aa4e-a9743e6598b3",
    "4036170a-3a27-4e12-b3cb-ac7150caa084",
    "fcdcde3e-71c8-4006-ac2c-db8abbfa0c9d",
    "04fc4590-eef7-4a1e-ab0c-02fdc902652c",
    "5dc97608-c2d0-4201-91af-114863a5cdc6",
    "163db244-453b-41bb-8e96-493ce6e70130",
    "978056b3-942a-405d-8da1-73a320369815",
    "678e991f-261c-4995-89f4-11bfb4c45958",
    "1defa1cd-8e5e-4729-9a00-a3b63e37d9bd",
    "13e3b39e-f16b-4d59-a1db-08da61a836b8",
    "6370abf1-0a55-411b-af28-0bd29cbe0a97",
    "c2cda5ea-37f6-42b7-beec-401adef9cafd",
    "e47ccdc7-59d8-49c7-b108-96e9aae6b9f2",
    "75cb24f3-750a-450d-82d2-1973dc2297ff",
    "941919a8-c183-457a-83cb-a94c4884eeea",
    "e02ef94e-6308-4542-972a-d8c43690c25a",
    "72a6d1c4-abb2-4f8e-b465-3abbadfd682e"
]

sql = "BEGIN;\n"

# Renaming levels
for i, topic in enumerate(topics):
    lid = level_ids[i]
    sql += f"UPDATE public.levels SET title = '{topic['title']}', description = '{topic['description']}' WHERE id = '{lid}';\n"

# Renaming lessons and clearing activities
for i, topic in enumerate(topics):
    lesson_id = lesson_ids[i]
    sql += f"UPDATE public.lessons SET title = '{topic['title']}' WHERE id = '{lesson_id}';\n"
    sql += f"DELETE FROM public.activities WHERE lesson_id = '{lesson_id}';\n"
    
    # Insert teaching info
    sql += f"INSERT INTO public.activities (lesson_id, type, question_text, content, order_index) VALUES ('{lesson_id}', 'info', '{topic['title']}', '{topic['intro']}', 1);\n"
    
    # Insert question
    opts = json.dumps(topic['options'])
    sql += f"INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES ('{lesson_id}', 'multiple_choice', '{topic['question']}', '{opts}'::jsonb, 2);\n"

sql += "COMMIT;"

with open('update_japan_lang.sql', 'w', encoding='utf-8') as f:
    f.write(sql)
