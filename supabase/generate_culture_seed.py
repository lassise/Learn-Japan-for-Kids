import json
import re

def escape_sql_string(s):
    if s is None:
        return 'NULL'
    # Escape single quotes by doubling them
    return "'" + s.replace("'", "''") + "'"

def main():
    with open('raw_culture_questions.txt', 'r', encoding='utf-8') as f:
        content = f.read()

    # Split content by question blocks (separated by blank lines, but we have a pattern)
    # The pattern is roughly:
    # - Context text
    #   Question X: ...
    #   A. ...
    #   B. ...
    #   C. ...
    #   Answer: ...

    # We can split by lines and process statefully
    lines = [l.strip() for l in content.splitlines() if l.strip()]
    
    questions = []
    current_q = {}
    
    # Simple state machine
    # States: EXPECT_CONTEXT, EXPECT_QUESTION, EXPECT_OPTIONS, EXPECT_ANSWER
    
    # Actually, the file format is consistent.
    # It starts with a line starting with "- " which is the context.
    # Or sometimes the context is just the line before "Question X".
    
    # Let's iterate through lines look for "- " start or "Question X"
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Check for context (starts with "- ")
        if line.startswith("- "):
            context = line[2:] # Strip "- "
            i += 1
            if i >= len(lines): break
            line = lines[i]
        else:
            # Maybe context was missing or formatted differently?
            # From the input file provided, it seems consistent: "- Context"
            context = ""

        # Check for Question Text
        # Format: "Question N: Text"
        match_q = re.match(r"Question \d+: (.*)", line)
        if match_q:
            question_text = match_q.group(1)
            # Combine context and question text
            full_question_text = f"{context}\n\n{question_text}" if context else question_text
            i += 1
        else:
            # Skip if we can't find a question
            i += 1
            continue
            
        # Get Options
        options = []
        # We expect A, B, C
        while i < len(lines):
            opt_line = lines[i]
            match_opt = re.match(r"([A-C])\. (.*)", opt_line)
            if match_opt:
                oid = match_opt.group(1)
                otext = match_opt.group(2)
                options.append({"id": oid, "text": otext})
                i += 1
            else:
                break
                
        # Get Answer
        answer_key = ""
        if i < len(lines):
            ans_line = lines[i]
            match_ans = re.match(r"Answer: ([A-C])", ans_line)
            if match_ans:
                answer_key = match_ans.group(1)
                i += 1
        
        # Build Item
        # Construct options JSON
        options_json_struct = []
        for opt in options:
            options_json_struct.append({
                "id": opt['id'],
                "text": opt['text'],
                "is_correct": (opt['id'] == answer_key)
            })
            
        questions.append({
            "text": full_question_text,
            "options": json.dumps(options_json_struct)
        })

    # Generate SQL
    # We need to split into 10 lessons (20 items each)
    
    sql_header = """-- CULTURE CONTENT EXPANSION V5 (User Context)
DO $$
DECLARE
    japan_id UUID;
    v1_id UUID;
    tourist_branch_id UUID;
    level_id UUID;
    lesson_id UUID;
BEGIN
    SELECT id INTO japan_id FROM public.countries WHERE code = 'JP';
    SELECT id INTO v1_id FROM public.country_versions WHERE country_id = japan_id AND version_number = 1;
    SELECT id INTO tourist_branch_id FROM public.branches WHERE country_version_id = v1_id AND name = 'Tourist Essentials';

    -- CLEANUP: Delete levels created by previous expansions (indices > 10) if any, or we can just append
    -- Strategy: We will replace content if it exists or create new.
    -- For simplicity, let's just delete the specific levels we are about to create if they exist by title?
    -- Actually, safest is to remove old ones derived from previous seeds if they clash.
    -- The previous v4 seed used indices 11-20 (10+1 to 10+10).
    -- We will reuse that range 11-20.
    
    DELETE FROM public.levels WHERE branch_id = tourist_branch_id AND order_index > 10 AND order_index <= 20;

"""

    sql_body = ""
    
    total_questions = len(questions)
    chunk_size = 20
    
    for lesson_idx in range(10): # 10 Lessons
        start_idx = lesson_idx * chunk_size
        end_idx = start_idx + chunk_size
        lesson_questions = questions[start_idx:end_idx]
        
        if not lesson_questions:
            break
            
        lesson_num = lesson_idx + 1
        
        sql_body += f"""
    -- Tourist Lesson {lesson_num} (Questions {start_idx+1}-{min(end_idx, total_questions)})
    INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (tourist_branch_id, 'Culture Level {lesson_num}', 'Japanese Manners & Customs {lesson_num}', 10 + {lesson_num}, 1) RETURNING id INTO level_id;

    INSERT INTO public.lessons (level_id, title, description, order_index)
    VALUES (level_id, 'Culture Lesson {lesson_num}', 'Japanese Etiquette {lesson_num}', 10 + {lesson_num}) RETURNING id INTO lesson_id;

    -- Intro
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'info', 'Welcome to Culture Lesson {lesson_num}! Master these scenarios.', null, 1);
    
"""
        
        for q_idx, q in enumerate(lesson_questions):
            q_text_esc = escape_sql_string(q['text'])
            opts_esc = escape_sql_string(q['options'])
            order_index = q_idx + 2 # Start at 2 because 1 is intro
            
            sql_body += f"""    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', {q_text_esc}, {opts_esc}::jsonb, {order_index});
"""
        
        sql_body += "\n"

    sql_footer = "END $$;"
    
    full_sql = sql_header + sql_body + sql_footer
    
    with open('seed_content_culture_v5.sql', 'w', encoding='utf-8') as f:
        f.write(full_sql)

    print(f"Generated seed content with {len(questions)} questions.")

if __name__ == "__main__":
    main()
