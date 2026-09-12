# Mutabe3 Prompts Library

AI-powered prompts for journalists, editors, and content teams working on the news platform. These prompts are designed for the Jordanian news context and Arabic content workflows.

---

## 📰 Article Writing & Content Creation

### Prompt 1: News Article Generator
**Use Case**: Quickly draft news articles from bullet points or press releases  
**For**: Journalists, content writers

```
You are an expert news writer for a Jordanian news agency. Transform the following information into a compelling news article in Arabic. 

Requirements:
- Write in formal but accessible Arabic suitable for a news website
- Include a compelling headline (max 12 words)
- Write a strong lede paragraph that answers who, what, when, where, why
- Include 4-5 body paragraphs with quotes and context
- End with a brief summary or forward-looking statement
- Optimize for online reading: shorter paragraphs, clear structure
- Include 3-5 relevant keywords for SEO
- Add a suggested featured image description

Source Information:
[PASTE YOUR PRESS RELEASE OR NOTES]

Output Format:
- Headline:
- SEO Keywords:
- Lede Paragraph:
- Body:
- Featured Image Description:
- Category Tags:
```

---

### Prompt 2: Headline & SEO Optimization
**Use Case**: Generate multiple headline options optimized for search and engagement  
**For**: Editors, content strategists

```
Act as a news headline specialist for a Jordanian news agency. Generate 5 alternative headlines for this article. Each should:
- Be compelling and clickable (encourage reading)
- Include relevant search keywords naturally
- Be accurate and not clickbait
- Vary in style (question, statement, urgent, analytical)
- Be 6-12 words for optimal social sharing
- Appeal to Arabic-speaking readers

Article Topic: [PASTE ARTICLE TOPIC/SUMMARY]
Target Keywords: [PASTE 3-5 KEYWORDS]

For each headline, include:
- The headline
- Why it works (engagement angle)
- Estimated CTR vs standard headlines
- Best platform to share on
```

---

### Prompt 3: Article Expansion from Brief
**Use Case**: Develop full articles from brief news summaries  
**For**: Junior journalists, content fill-in teams

```
You are a skilled news reporter for a Jordanian news agency. Expand this brief news item into a complete, publishable article.

Brief: [PASTE YOUR SHORT NEWS ITEM]

Requirements:
- Add relevant context and background
- Include quotes (mark as [ATTRIBUTED TO X] if needing journalist to verify)
- Connect to broader regional trends if relevant
- Write in formal Arabic news style
- Structure: Headline + Lede + Context + Details + Forward Look
- Length: 400-600 words
- Suggest 3-5 credible sources to interview/contact for quotes
- Mark sections needing fact-check with [VERIFY]

Output for review and editing.
```

---

### Prompt 4: Content Gap Analysis
**Use Case**: Identify underreported topics and content opportunities  
**For**: Editorial directors, content strategists

```
Analyze news coverage from [DATE RANGE] and identify content gaps for a Jordanian news agency.

Recent Articles Published:
[PASTE LIST OF RECENT ARTICLE TOPICS]

Requirements:
- Identify 5-7 underreported or missed story angles
- Suggest which stories are trending regionally but missing locally
- For each gap, provide:
  - Topic/angle
  - Why it matters to Jordanian readers
  - Suggested sources/experts to contact
  - Estimated reader interest (high/medium/low)
  - Urgency (breaking, developing, evergreen)
- Rank by newsworthiness and reader engagement potential

Focus Areas:
- Politics & Government
- Business & Economy
- Technology & Innovation
- Society & Culture
- Regional News
```

---

## ✏️ Editorial Review & Fact-Checking

### Prompt 5: Editorial Review Checklist
**Use Case**: Systematic review of articles before publication  
**For**: Editors, copy editors

```
Review this news article using our editorial standards and flag issues:

Article: [PASTE ARTICLE TEXT]

Checklist Review:
1. **Accuracy**: Are all facts verifiable? Flag any claims needing sources.
2. **Bias**: Is the writing objective? Any opinion creeping in?
3. **Balance**: Are multiple perspectives represented? Is fairness maintained?
4. **Clarity**: Is it easy to understand? Any complex terms needing explanation?
5. **Compliance**: Does it follow journalistic ethics? Any potential legal issues?
6. **Engagement**: Will it hold reader attention? Is the lede compelling?
7. **SEO**: Are keywords naturally included? Is headline optimized?
8. **Arabic Quality**: Is the language correct, accessible, formal?

Output Format:
- [PASS/NEEDS REVISION] - overall recommendation
- Critical Issues (must fix before publish)
- Minor Issues (suggested improvements)
- Questions for journalist
- Approved for publish: YES/NO
```

---

### Prompt 6: Fact-Check Assistant
**Use Case**: Quick fact-checking and source verification  
**For**: Fact-checkers, editors

```
Fact-check the following claims from a news article. For each claim:
- State if it's [VERIFIED/UNVERIFIED/DISPUTED]
- Cite source(s) if available
- Note any context that changes the claim
- Suggest improvements to the wording

Claims to Verify:
1. [CLAIM 1]
2. [CLAIM 2]
3. [CLAIM 3]

Known Context/Background:
[PASTE ANY BACKGROUND INFO]

Important: Focus on factual accuracy relevant to Jordan and the Middle East.
Flag any claims that contradict reliable sources or need current verification.
```

---

### Prompt 7: Sensitive Content Review
**Use Case**: Review articles on sensitive political, religious, or cultural topics  
**For**: Senior editors, compliance team

```
Review this article on a sensitive topic for Jordanian publication:

Article: [PASTE ARTICLE]
Topic Classification: [POLITICAL/RELIGIOUS/CULTURAL/CONFLICT-RELATED]

Review Criteria:
1. **Legal Risk**: Does it violate Jordanian media laws or regulations?
2. **Religious Sensitivity**: Could it offend religious communities? Is it respectful?
3. **Political Risk**: Does it fairly represent all political perspectives? Any inflammatory language?
4. **Cultural Appropriateness**: Does it respect Jordanian cultural values?
5. **Factual Accuracy**: Are claims about sensitive topics well-sourced?
6. **Language Tone**: Is the tone professional and measured?

Output:
- CLEAR TO PUBLISH / NEEDS REVISION / DO NOT PUBLISH
- Specific concerns (if any)
- Suggested changes
- If needs legal review: YES/NO
```

---

## 🎯 Content Strategy & SEO

### Prompt 8: Content Calendar Generator
**Use Case**: Plan content for upcoming weeks/months  
**For**: Content strategists, editors

```
Create a content calendar for the next 4 weeks for a Jordanian news agency.

Context:
- Current Date: [DATE]
- Upcoming Events: [PASTE LIST]
- Seasonal Considerations: [E.G., HOLIDAYS, SEASONS]
- Traffic Patterns: [PEAK TIMES FOR READERS]

Requirements for Content Plan:
- 3-5 articles per day (mix of breaking, planned, evergreen)
- Cover all major sections: Politics, Business, Society, Culture, Sports, Tech
- Include 2-3 investigative/longform pieces
- Plan for breaking news flexibility (20% of calendar)
- Include SEO-friendly topics with search volume
- Suggest best publishing times for each article
- Include reporter/writer assignments

Output Format:
- Day-by-day calendar with topics, writers, publishing times
- SEO keywords for each topic
- Distribution strategy (email, social, homepage)
- Flexibility notes for breaking news coverage
```

---

### Prompt 9: Trending Topic Analysis
**Use Case**: Identify trending stories and reader interests  
**For**: Social media managers, editors

```
Analyze current trending topics and suggest relevant news angles for your Jordanian audience.

Current Date: [DATE]
Last 7 Days Analytics:
[PASTE TRAFFIC/ENGAGEMENT DATA]

Requirements:
- Identify 5-7 trending topics your readers care about
- For each trend:
  - What's driving interest?
  - Angle specific to Jordan or the region
  - Story idea with newsworthiness
  - Suggested format (article, video, interactive)
  - Estimated engagement potential
  - Which audience segment cares most?
- Flag topics that are trending globally but NOT locally (ignore these)
- Suggest how to capitalize on emerging trends

Focus: What stories should we cover to keep readers engaged and competitive?
```

---

### Prompt 10: SEO & Long-Tail Keyword Research
**Use Case**: Find underserved search keywords with reader demand  
**For**: Content strategists, SEO specialists

```
Identify long-tail keywords for a Jordanian news website that have:
- Search volume (people looking for these topics)
- Low competition (opportunity to rank)
- High reader intent (people will read and engage)

Topic Area: [POLITICS/BUSINESS/TECH/SOCIETY/SPORTS]
Current Ranking Topics: [PASTE 5-10 TOPICS YOU RANK FOR]

Requirements:
- 10-15 keyword opportunities
- For each keyword:
  - Search volume estimate
  - Competition level (high/medium/low)
  - Article angle/story idea
  - How it fits our content strategy
  - Estimated time to rank
  - Content freshness strategy (how often to update)
- Group keywords by theme (helps content clustering)
- Prioritize by opportunity score

Exclude: Irrelevant keywords, low-intent searches, hyper-competitive terms
```

---

## 📊 Analytics & Audience Insights

### Prompt 11: Article Performance Analysis
**Use Case**: Analyze what content performs best and why  
**For**: Analytics team, editors

```
Analyze the performance of recent articles to understand what drives engagement.

Articles Data:
[PASTE: TITLE | VIEWS | AVG TIME | BOUNCE RATE | SHARES | COMMENTS]

Requirements:
- What patterns do top performers share? (topic, length, publish time, writer, etc.)
- Which article types drive highest engagement? (breaking, analysis, investigation, opinion)
- How does topic affect performance? (politics, business, sports, culture, tech)
- Best performing article formats? (text, video, listicle, Q&A, interactive)
- Best publishing times? (does timing affect views/engagement?)
- Which topics get most comments/discussion?

Output:
- Key insights about what works
- 3-5 recommendations for future content
- "Golden formula" patterns to replicate
- Topics/formats to avoid or reduce
- Testing recommendation: what to try next?
```

---

### Prompt 12: Audience Demographic Insights
**Use Case**: Understand who's reading and why  
**For**: Editorial strategy, advertising team

```
Profile the typical Mutabe3 reader based on analytics data.

Analytics Data:
[PASTE AUDIENCE DATA: AGE, GENDER, LOCATION, DEVICE, INTERESTS, READING TIME]

Create Reader Personas:
- Persona 1: [DESCRIPTION] - reads [TOPICS], visits [FREQUENCY], engages via [CHANNELS]
- Persona 2: [DESCRIPTION]
- Persona 3: [DESCRIPTION]

For Each Persona, Provide:
- Who they are (age, location, occupation, interests)
- What drives them to read news
- Which topics interest them most
- When/where they read (morning commute, desktop, mobile)
- What content format they prefer
- How they share/engage
- Ad/sponsorship opportunities for this segment

Strategy Implications:
- How should we tailor content for each audience?
- Which sections to emphasize?
- Topic diversification recommendations?
```

---

## 💬 Community Management & Moderation

### Prompt 13: Comment Moderation Guidelines
**Use Case**: Review and moderate reader comments for quality and safety  
**For**: Community moderators, editors

```
Review and moderate these comments on a news article:

Article Topic: [TOPIC]

Comments to Review:
1. "[COMMENT TEXT]"
2. "[COMMENT TEXT]"
3. "[COMMENT TEXT]"

Moderation Criteria:
- [APPROVE] - Constructive, relevant, respectful
- [FLAG FOR REVIEW] - Potentially offensive or misleading
- [REMOVE] - Violates community guidelines
- [REQUIRE EDITS] - Good point but needs moderation

For each comment:
- Decision: APPROVE/FLAG/REMOVE/EDIT
- Reason: Why did you make this decision?
- If edit needed: What should be changed?
- Risk level: LOW/MEDIUM/HIGH

Guidelines:
- Allow diverse opinions, remove personal attacks
- Remove misinformation if contradicted by credible sources
- Flag religious/political sensitivity
- Remove spam, self-promotion, off-topic
- Respect cultural context (Jordanian audience)
```

---

### Prompt 14: Engagement Response Strategy
**Use Case**: Plan responses to common reader questions/feedback  
**For**: Community managers, editors

```
Create response templates for common reader questions and feedback on news articles.

Common Questions/Feedback:
1. [QUESTION/FEEDBACK TYPE]
2. [QUESTION/FEEDBACK TYPE]
3. [QUESTION/FEEDBACK TYPE]

For Each, Provide:
- Response Template (professional, helpful, 2-3 sentences)
- When to use it
- Variations for different tones (clarification vs. correction vs. appreciation)
- When to escalate to journalist/editor
- When to redirect to other channels (email, social DM, etc.)

Example Response Templates Needed:
- Factual correction requests
- "Why didn't you cover X?"
- Subscription/access questions
- Article feedback/praise
- Requests for more information
```

---

## 📱 Social Media & Distribution

### Prompt 15: Social Media Post Generator
**Use Case**: Create shareable social posts from articles  
**For**: Social media managers, content team

```
Create social media posts for this article optimized for engagement on Arab platforms.

Article Details:
- Headline: [HEADLINE]
- Summary: [ARTICLE SUMMARY]
- URL: [LINK]
- Featured Image: [DESCRIBE IMAGE]

Requirements - Create posts for:
1. **Twitter/X** (2-3 options)
   - Compelling hook (max 280 chars)
   - Include relevant hashtags (#أخبار_الأردن, etc.)
   - Engagement-focused

2. **Facebook** (2-3 options)
   - Longer format (up to 500 chars)
   - Emotional hook
   - Include call-to-action (Read, Share, Comment)

3. **TikTok/Reels** (if video/visual)
   - Hook text for first 3 seconds
   - Suggested video concepts
   - Hashtags and trending sounds

4. **LinkedIn** (if business-relevant)
   - Professional angle
   - Thought leadership framing

For Each Post:
- Post text
- Suggested hashtags
- Best time to post
- Expected engagement rate
- CTA (learn more, read full story, share opinion)

Note: Write posts in Arabic, using natural, conversational language suitable for social media.
```

---

### Prompt 16: Hashtag Strategy
**Use Case**: Identify and create trending hashtags for campaigns  
**For**: Social media strategy, marketing team

```
Create a hashtag strategy for Mutabe3 news articles and campaigns.

Content Focus Areas:
- Daily news coverage
- Investigative journalism
- Breaking news coverage
- Longform/analysis pieces
- Community engagement

Requirements:
1. **Permanent/Brand Hashtags**
   - Main channel hashtag (#mutabe3)
   - Section hashtags (#أخبار_السياسة, #أخبار_الاقتصاد, etc.)
   - Call-to-action hashtags (#اشترك_الآن, #شارك_رأيك)

2. **Trending/Campaign Hashtags**
   - Seasonal campaigns (elections, holidays, events)
   - Hashtags for reader engagement
   - Hashtags for journalist recognition

3. **Arabic Hashtags**
   - Search-friendly Arabic hashtags
   - Regional variations (Jordan-specific, Gulf, Levant)
   - Multilingual options (Arabic + English)

For Each Hashtag:
- Hashtag text
- Purpose/use case
- Platforms to use on
- Frequency guidelines
- Tone/context

Best Practices: What should we avoid?
```

---

## 🔍 Investigation & Research

### Prompt 17: Investigation Brief Generator
**Use Case**: Plan investigative journalism projects  
**For**: Investigation team leads, senior editors

```
Develop a plan for an investigative journalism project.

Story Idea: [YOUR INVESTIGATION TOPIC]
Initial Lead/Tip: [WHAT YOU KNOW]

Create Investigation Plan:
1. **Scope**
   - Central question: What are we trying to uncover?
   - Why it matters to Jordanian readers
   - Timeline/importance (urgent vs. long-term)

2. **Research**
   - 5-10 key questions to answer
   - Types of sources needed (experts, officials, victims, insiders)
   - Document types to request (records, emails, contracts, budgets)
   - Public databases to check
   - Regional context/background needed

3. **Sources**
   - Primary sources (who to interview?)
   - Secondary sources (existing reporting)
   - On-the-record vs. off-the-record approach
   - Protection strategy for sensitive sources

4. **Methodology**
   - Research approach (interviews, FOIA, data analysis, undercover)
   - Verification strategy (how to confirm findings)
   - Fact-checking process

5. **Timeline**
   - Phase 1: Initial research
   - Phase 2: Interview/source development
   - Phase 3: Analysis and verification
   - Phase 4: Writing and legal review
   - Estimated completion date

6. **Resources Needed**
   - Team members and roles
   - Budget/travel
   - Technical needs (data tools, etc.)

7. **Risk Assessment**
   - Legal risks and mitigation
   - Safety concerns (if any)
   - Editorial sensitivities
```

---

### Prompt 18: Expert Source Database Builder
**Use Case**: Build a database of experts for quick sources  
**For**: Research team, journalists

```
Create an expert source database entry for journalists to use.

Expert Information:
- Name: [NAME]
- Title/Organization: [AFFILIATION]
- Expertise Areas: [TOPICS]
- Languages: [ARABIC/ENGLISH/OTHER]
- Contact: [PHONE/EMAIL]
- Previous Coverage: [ANY PRIOR INTERVIEWS/QUOTES]

Questions to Answer:
1. What topics can they comment on authoritatively?
2. Bias/perspective: What's their angle? (academic, business, NGO, political?)
3. Reliability: Are quotes accurate? Do they overstate?
4. Accessibility: How quickly do they respond? Availability?
5. Media savvy: Are they good on-the-record sources? Any media training?
6. Conflicts: Any potential conflicts of interest?

Quick Call Notes:
- Best time to reach
- Preferred communication method
- Topics to avoid
- Previous story collaboration
- Tags for categorization

Database Category:
- Economics & Finance
- Politics & Government
- Technology & Innovation
- Society & Culture
- Infrastructure & Development
- International Relations
- Other: _________
```

---

## 📝 Translation & Localization

### Prompt 19: Arabic-English Translation QA
**Use Case**: Ensure accurate translation of content between Arabic and English  
**For**: Translators, bilingual editors

```
Review the translation quality between the original and translated versions:

Original (Arabic):
[PASTE ARABIC TEXT]

Translation (English):
[PASTE ENGLISH TRANSLATION]

QA Checklist:
1. **Accuracy**: Does the translation convey the original meaning exactly?
2. **Tone**: Does it maintain the formal news style?
3. **Terminology**: Are journalistic terms translated correctly?
4. **Colloquialisms**: Any Jordanian colloquialisms needing localization?
5. **Names/Places**: Are proper nouns translated/transliterated correctly?
6. **Numbers/Data**: Are figures, percentages, and data accurate?
7. **Headlines**: Does the English headline match the Arabic? SEO-friendly?
8. **Length**: Is the English roughly same length? (readability factor)

Issues Found:
- [ISSUE] - Line X - Suggestion: [FIX]

Rating: ⭐⭐⭐⭐⭐ (accuracy) / ⭐⭐⭐⭐⭐ (tone)
Approved for publish: YES / NO / NEEDS REVISION
```

---

### Prompt 20: Localization Adaptation Guide
**Use Case**: Adapt international news for Jordanian/Arab audience  
**For**: Editors, localization specialists

```
Adapt this international news story for a Jordanian/Arab audience:

Original Story:
[PASTE INTERNATIONAL NEWS STORY]

Localization Requirements:
1. **Angle**: What's the relevance to Jordan/Arab readers?
2. **Context**: Add regional/local context that international version lacks
3. **Sources**: Add Jordanian or Arab expert perspectives
4. **Language**: Adapt to Arabic news style and terminology
5. **Emphasis**: Shift focus to what matters most to local readers

Adaptation Tasks:
- Rewrite headline for local relevance
- Adjust lede to lead with Jordanian/Arab impact
- Add paragraphs of local context (min 2-3)
- Identify Jordanian/Arab experts to quote/add
- Explain unfamiliar references for Arab audience
- Adjust tone from international to local news voice

Output:
- New headline
- New lede
- Local context additions
- Suggested sources/experts to contact
- Length target: [ORIGINAL WORD COUNT vs. TARGET]
```

---

## 🎓 Training & Team Development

### Prompt 21: Journalism Ethics Scenario
**Use Case**: Train team on ethical decision-making  
**For**: Editorial leadership, journalist development

```
Ethical Scenario for Newsroom Training:

Scenario:
[DESCRIBE AN ETHICAL DILEMMA]

For Discussion:
1. What's the core ethical issue here?
2. What are the journalist's options?
3. What are the pros/cons of each approach?
4. What does our editorial standards say?
5. How would you decide?
6. What could go wrong? What safeguards?

Related Policy:
[LINK TO RELEVANT ETHICS POLICY]

Learning Objectives:
- Understand when/how to use unnamed sources
- Balance newsworthiness vs. privacy concerns
- Navigate political/cultural sensitivity
- Verify facts in ambiguous situations

Discussion Questions:
- How do Jordanian media laws affect this?
- How do regional cultural norms apply?
- What would different reader groups think?
```

---

## Usage Guide

### How to Use These Prompts

1. **Copy the relevant prompt** from this library
2. **Customize** with your specific content/situation
3. **Paste into Claude** (or your AI assistant of choice)
4. **Review output** for accuracy and tone
5. **Edit and refine** before publication or team use

### Best Practices

- ✅ Always verify AI-generated content with human review
- ✅ Cite sources for factual claims, don't rely only on AI
- ✅ Adapt prompts for your specific context
- ✅ Keep human journalists in the loop for major decisions
- ✅ Use AI to augment, not replace, editorial judgment

### Prompt Maintenance

- Review prompts quarterly for accuracy
- Update based on new news situations or changes to publication
- Get journalist feedback on which prompts are most useful
- Add new prompts as new needs arise

---

**Last Updated**: 2026-09-12  
**For**: Mutabe3 Editorial Team  
**Questions?** Contact your editor or project lead
