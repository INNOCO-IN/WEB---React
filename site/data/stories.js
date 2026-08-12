/* IN Website — stories collection.
   SINGLE SOURCE OF TRUTH for every story on the site.
   Consumed by: Story-Index.EN / Story-Index.KO / Home story card / Constellation.
   Generated from the pages 2026-08-03; edit HERE from now on, never in a page.

   Record shape
     id        stable slug — never change it, it is the permalink (?story=<id>)
     date      ISO yyyy-mm-dd, drives ordering and the month grouping
     format    key into IN_TAXONOMY.format
     topic     key into IN_TAXONOMY.topic
     color     plate colour behind the card when there is no photo
     href      destination page, "#" = reads inline in the index only
     media     { image, fit, ratio, pos } — image null = colour plate
     draft     true = shows the "still being written" note
     en / ko   { eyebrow, title, body, credit, paras[], kicker[]? }
               STRUCTURE is shared, WORDS are per language. Both sides must
               carry the same number of paras.
*/
window.IN_TAXONOMY = {
  format: {
    "writing": {
      "en": "Writing",
      "ko": "글"
    },
    "drawing": {
      "en": "Drawing",
      "ko": "그림"
    },
    "photo": {
      "en": "Photo",
      "ko": "사진"
    },
    "video": {
      "en": "Video",
      "ko": "영상"
    },
    "music": {
      "en": "Music",
      "ko": "음악"
    },
    "dance": {
      "en": "Dance",
      "ko": "춤"
    },
    "craft": {
      "en": "Craft",
      "ko": "공예"
    },
    "recipe": {
      "en": "Recipe",
      "ko": "요리법"
    },
    "symbol": {
      "en": "Symbol",
      "ko": "상징"
    }
  },
  topic: {
    "signature": {
      "en": "Signature",
      "ko": "시그니처"
    },
    "family": {
      "en": "Family",
      "ko": "가족"
    },
    "lived": {
      "en": "I lived it",
      "ko": "내가 살아낸 것"
    },
    "blog": {
      "en": "Blog reflection",
      "ko": "블로그 회고"
    },
    "noticed": {
      "en": "I noticed it",
      "ko": "내가 알아차린 것"
    }
  }
};

window.IN_STORIES = [
  {
    "id": "this-is-us",
    "date": "2026-07-16",
    "format": "writing",
    "topic": "signature",
    "color": "#F3EAD0",
    "href": "#",
    "media": {
      "image": null
    },
    "en": {
      "eyebrow": "I lived it · A classroom",
      "title": "“This is us”",
      "body": "I stopped teaching and asked one real question. By the end, a boy pointed at what they’d made and said: this is us.",
      "credit": "A teacher",
      "paras": [
        "Twenty minutes into the lesson on constellations, no one had looked up.",
        "I could hear how flat my own voice was. The words were on the board — definitions, distances, names — and none of it was landing. I remember thinking: why can’t I reach them? I had planned this well. I was doing everything I was supposed to do.",
        "What I didn’t see then was how hard I was working to hold the room together by myself. That was the job, as I understood it. Thirty students, one of me, and a wall between us that it was my responsibility to get across.",
        "So when I stopped, it wasn’t wisdom. It was exhaustion.",
        "I put down the lesson plan and asked them something I genuinely didn’t have the answer to. Why do you think stars connect?",
        "“Stars, I guess,” someone said. Then someone else, quieter: “Connected stars?”",
        "I sat down among them — not at the front — and asked what kind of star each of them would be. A bright one. Part of a cluster. A lonely one, one boy said, and didn’t look up.",
        "Then something happened that I didn’t do.",
        "They stopped answering me and started answering each other. What if we combined these two shapes? Add a star here. They were up, moving, drawing. My part had shrunk to almost nothing, and the lesson was working better than it ever had when I was carrying it.",
        "I felt the old panic first — if I’m not holding this, it falls apart. It didn’t fall apart. It got better. That was the hardest and best thing I learned that day: the room was never mine to hold. I was one of them, not above them, and the moment I sat down, they could feel it.",
        "By the end they’d made a map, every star one of them. A boy pointed at it and said, “This is us.”"
      ],
      "kicker": [
        "I thought MEWE was the thing I’d write on the board.",
        "It was the thing that happened when I sat down."
      ]
    },
    "ko": {
      "eyebrow": "내가 살아낸 것 · 어느 교실",
      "title": "“이게 우리예요”",
      "body": "가르치기를 멈추고 진짜 질문 하나를 던졌습니다. 끝날 무렵, 한 아이가 함께 만든 것을 가리키며 말했습니다: 이게 우리예요.",
      "credit": "한 선생님",
      "paras": [
        "별자리 수업이 시작되고 20분, 아무도 고개를 들지 않았습니다.",
        "제 목소리가 얼마나 납작한지 스스로도 들렸습니다. 칠판에는 정의와 거리와 이름들이 적혀 있었지만, 무엇 하나 가닿지 않았습니다. 이런 생각을 했던 게 기억납니다: 왜 아이들에게 닿을 수 없을까? 준비는 잘했습니다. 해야 할 일은 다 하고 있었습니다.",
        "그때 제가 보지 못했던 것은, 교실을 혼자서 붙들기 위해 제가 얼마나 애쓰고 있었는가였습니다. 제가 이해한 일이란 그런 것이었으니까요. 서른 명의 학생, 한 명의 나, 그리고 건너는 것이 내 책임인 우리 사이의 벽.",
        "그래서 멈췄을 때, 그것은 지혜가 아니라 탈진이었습니다.",
        "수업 계획서를 내려놓고, 저도 정말 답을 모르는 것을 물었습니다. 별들은 왜 이어진다고 생각해?",
        "“그냥… 별이니까요.” 누군가 말했습니다. 그리고 더 조용한 목소리: “이어진 별이요?”",
        "저는 앞이 아니라 아이들 사이에 앉아, 각자 어떤 별이 되고 싶은지 물었습니다. 밝은 별. 성단의 일부. 외로운 별이요, 한 아이가 고개를 들지 않은 채 말했습니다.",
        "그리고 제가 하지 않은 일이 일어났습니다.",
        "아이들은 저에게 답하기를 멈추고 서로에게 답하기 시작했습니다. 이 두 모양을 합치면 어때? 여기에 별 하나 더. 아이들은 일어나 움직이고 그리고 있었습니다. 제 몫은 거의 없어졌는데, 수업은 제가 끌고 갈 때보다 훨씬 잘 굴러갔습니다.",
        "오래된 불안이 먼저 찾아왔습니다 — 내가 붙들지 않으면 무너질 거야. 무너지지 않았습니다. 더 좋아졌습니다. 그날 배운 가장 어렵고 가장 좋은 것: 교실은 애초에 내가 붙들 것이 아니었다는 것. 저는 아이들 위가 아니라 아이들 중 하나였고, 제가 앉는 순간 아이들도 그것을 느꼈습니다.",
        "끝날 무렵 아이들은 지도를 만들었습니다. 별 하나하나가 아이들 자신이었습니다. 한 아이가 그것을 가리키며 말했습니다. “이게 우리예요.”"
      ],
      "kicker": [
        "MEWE는 제가 칠판에 적을 것이라고 생각했습니다.",
        "그것은 제가 앉았을 때 일어난 일이었습니다."
      ]
    }
  },
  {
    "id": "grandma-it-worked",
    "date": "2026-07-10",
    "format": "writing",
    "topic": "family",
    "color": "#F3EAD0",
    "href": "#",
    "media": {
      "image": null
    },
    "en": {
      "eyebrow": "A grandmother’s tale",
      "title": "“Grandma, it worked!”",
      "body": "A grandson comes home breathless — he tried MEWE on his friends, and for the first time, watched it actually work.",
      "credit": "A grandmother",
      "paras": [
        "I was in my armchair with my afternoon tea when I heard footsteps running toward me.",
        "My grandson burst in, too excited to sit down. “Grandma! You won’t believe what happened today!”",
        "“Tell me,” I said.",
        "“You know those Möbius-strip workshops you keep telling me about? I didn’t really get it. I mean — how could something so simple change anything?”",
        "I nodded. I remembered that doubt well.",
        "“But today I tried it. At home. The MEWE thing, where everyone gets a say and nobody judges anyone else’s idea. I used it for the summer camp decision. And Grandma — it worked. We all listened. We actually made a better decision together.”",
        "His eyes were lit up in a way I hadn’t seen before. “I made one rule: everyone gets to contribute, nobody judges, nobody pushes their own idea through. At first everyone was just curious. Then we actually enjoyed it — building on each other’s ideas, saying thank you for them.”",
        "“But that’s not even the best part,” he went on. “One of my basketball friends was stressed about his chores, so I said I’d help him after practice. Then I thought — why stop there? So it turned into a whole cleaning party. We did our homework together after.”",
        "“That sounds wonderful,” I said.",
        "“It was! It’s like I found this whole new way to connect with people. I want to do a neighborhood clean-up with my friends — a potluck, the whole thing. Bring everyone closer.”",
        "I watched a boy who’d been doubtful an hour ago talk like someone who believed completely.",
        "Then he looked at me, serious now. “I want to keep learning, Grandma. I want to hear how other kids are doing this in their own neighborhoods. Will you help me find out?”",
        "“Of course,” I said.",
        "We got out a big sheet of paper and started sketching out ideas together."
      ]
    },
    "ko": {
      "eyebrow": "어느 할머니의 스토리",
      "title": "“할머니, 됐어요!”",
      "body": "손자가 숨차게 집으로 뛰어 들어옵니다 — 친구들에게 MEWE를 시도해 봤고, 처음으로 그것이 실제로 작동하는 것을 지켜봤습니다.",
      "credit": "한 할머니",
      "paras": [
        "오후의 차를 들고 안락의자에 앉아 있는데, 달려오는 발소리가 들렸습니다.",
        "손자가 뛰어 들어왔습니다. 앉지도 못할 만큼 들떠서. “할머니! 오늘 무슨 일이 있었는지 못 믿으실 거예요!”",
        "“말해 보렴.” 제가 말했습니다.",
        "“할머니가 자꾸 말씀하시던 그 뫼비우스 띠 워크숍 있잖아요? 사실 잘 몰랐어요. 그렇게 단순한 게 뭘 바꿀 수 있겠어요?”",
        "고개를 끄덕였습니다. 그 의심을 저도 잘 기억하니까요.",
        "“그런데 오늘 해 봤어요. 집에서요. 모두가 말할 수 있고 아무도 남의 생각을 판단하지 않는 그 MEWE요. 여름 캠프 정할 때 써 봤는데 — 할머니, 됐어요. 우리 모두 들었어요. 정말로 함께 더 나은 결정을 했어요.”",
        "한 번도 본 적 없는 눈빛이었습니다. “규칙은 하나만 만들었어요. 모두가 보태고, 아무도 판단하지 않고, 아무도 자기 생각을 밀어붙이지 않기. 처음엔 다들 그냥 신기해했는데, 나중엔 정말 즐거웠어요 — 서로의 생각 위에 쌓고, 고맙다고 말하고.”",
        "“근데 그게 최고가 아니에요.” 아이가 이어 말했습니다. “농구 친구 하나가 집안일 때문에 스트레스를 받길래, 연습 끝나고 도와주겠다고 했어요. 그러다 생각했죠 — 거기서 멈출 이유가 있나? 그래서 아예 청소 파티가 됐어요. 끝나고 숙제도 같이 했고요.”",
        "“정말 근사하구나.” 제가 말했습니다.",
        "“맞아요! 사람들과 이어지는 완전히 새로운 방법을 찾은 것 같아요. 친구들이랑 동네 청소도 하고 싶어요 — 포틀럭도 하고, 전부 다요. 모두를 더 가깝게요.”",
        "한 시간 전만 해도 의심하던 아이가, 완전히 믿는 사람처럼 말하는 것을 지켜보았습니다.",
        "그리고 아이는 진지한 얼굴로 저를 보았습니다. “계속 배우고 싶어요, 할머니. 다른 아이들은 자기 동네에서 이걸 어떻게 하는지 듣고 싶어요. 찾는 걸 도와주실래요?”",
        "“물론이지.” 제가 말했습니다.",
        "우리는 큰 종이를 꺼내 함께 아이디어를 그리기 시작했습니다."
      ]
    }
  },
  {
    "id": "pathfinder-journey",
    "date": "2023-07-08",
    "format": "writing",
    "topic": "lived",
    "color": "#2E2018",
    "href": "#",
    "media": {
      "image": "story-img/brothers.jpg"
    },
    "en": {
      "eyebrow": "I lived it · Pathfinder",
      "title": "I had done it everywhere but home",
      "body": "She had run social impact programs for years. It never occurred to her to point one at her own brothers.",
      "credit": "Alia Ahmed",
      "paras": [
        "Pathfinder program was an eye-opening platform on MEWE equilibrium. This is deep-rooted in our faith to work for a bigger purpose in life to benefit the community. Being part of this journey led me to think deeply of making an impact constructively to my family first before venturing out on other passion projects.",
        "Initially when I joined, my goal was to research on building a faith-centered fun, i.e. interactive school. The mission was to share the principles and knowledge of faith, which is the guiding compass of our lives, from a young age. With Pathfinder, I observed this mission needed a grass-root level reach.",
        "This led me to facilitating my Pathfinder project in understanding my younger brothers’ journey in learning about faith and its impact in their lives.",
        "They are aged 16 and 18 years old, one studying high school with interests in biology and fitness, and the elder one is in his first year of university whilst playing cricket for the state team. Now, how might we enhance the faith which is already part of their lives in the form of prayer, so that it can be a meaningful connection with The Creator, was the learning objective.",
        "I absolutely loved the meditation sessions by Tanya to start off with; it brought all the virtual participants together in a common space with our mindset. This also showed how fascinating the human mind and experience is, as when at one point I was deeply impacted, a fellow participant felt or thought differently and vice-versa.",
        "The detailed content and use of the tool Miro was brilliant in penning and mapping our dynamic ideas.",
        "What I enjoyed learning the most was the link between nature and facilitation — like the fungi, which have created an ecosystem, we too must create a change in contributing to the community. My feedback would be to extend the course to dive deep into the main topics and emphasize on practical practice, e.g. participants hosting frequent facilitations with a mentor, can make us improve and better reach our goal of graduating out of the course with a tool we can implement.",
        "With the facilitation questions, guidance on how to convert the tone and text for our context would have been useful.",
        "My takeaways from the program are many! The main ones being a deeper understanding of my brothers and the challenges youth face in imbibing the faith in today’s world, and at the same time the immense benefits they gain from following the faith and relying on The Creator as the guiding compass of their life.",
        "I learnt how asking questions and waiting to hear their interest in the topic makes for a more useful conversation, than a one-sided one if I were to approach directly.",
        "This was the first time I used a formal structured approach to a challenge I could see within my immediate family, even though I have done countless social impact programs externally — for e.g. when building my financial literacy app for Gen Z, the thought never came across to do the same at home, until this program.",
        "By the end of it, both my brothers and I had a deeper understanding of each other’s goals in life and aligned it with the love of faith.",
        "Also, I had designed and published an engaging children’s prayer book with the help of my family and Qur’an class volunteers, with prayers of Prophets like Abraham, Noah and about parents, knowledge and nature, with activities for each. This was gifted as my wedding favor in December, which was beneficial for my family at a larger scale, and I hope to publish it to help many more!",
        "I see the Pathfinder program being a tool for youth to guide their mission in life beyond themselves, people who are changemakers in the community to find a network, designers and educators who have a role of facilitation as part of their work. This is ideal for an individual with a social project and is looking for a direction in refining their idea to implementation."
      ]
    },
    "ko": {
      "eyebrow": "내가 살아낸 것 · 패스파인더",
      "title": "집만 빼고 어디서나 해 왔다는 것",
      "body": "그녀는 수년간 소셜 임팩트 프로그램을 운영해 왔습니다. 그것을 자신의 형제들에게 향하게 할 생각은 한 번도 하지 못했습니다.",
      "credit": "Alia Ahmed",
      "paras": [
        "패스파인더 프로그램은 MEWE의 균형에 눈뜨게 해 준 자리였습니다. 공동체를 이롭게 하는 더 큰 목적을 위해 일한다는 것은 우리 신앙에 깊이 뿌리내린 것입니다. 이 여정에 함께하며, 다른 열정 프로젝트로 나서기 전에 먼저 나의 가족에게 건설적인 영향을 만드는 일을 깊이 생각하게 되었습니다.",
        "처음 합류했을 때 제 목표는 신앙 중심의 즐겁고 상호적인 학교를 세우는 연구였습니다. 우리 삶의 나침반인 신앙의 원리와 지식을 어릴 때부터 나누는 것이 사명이었습니다. 패스파인더를 지나며, 이 사명에는 풀뿌리 차원의 접근이 필요하다는 것을 보았습니다.",
        "그래서 저의 패스파인더 프로젝트는 남동생들이 신앙을 배워 가는 여정과 그것이 그들의 삶에 미치는 영향을 이해하는 일이 되었습니다.",
        "동생들은 열여섯과 열여덟입니다. 한 명은 생물학과 운동을 좋아하는 고등학생이고, 형은 주 대표팀에서 크리켓을 하며 대학 1학년을 다닙니다. 기도의 형태로 이미 그들의 삶의 일부인 신앙을 어떻게 더 깊게 하여 창조주와의 의미 있는 연결이 되게 할 수 있을까 — 그것이 배움의 목표였습니다.",
        "타냐가 이끈 명상 세션이 정말 좋았습니다. 온라인 참가자 모두를 마음가짐이라는 공통의 공간으로 모아 주었으니까요. 인간의 마음과 경험이 얼마나 신비로운지도 보여주었습니다 — 제가 깊이 흔들린 지점에서 다른 참가자는 다르게 느끼고 생각했고, 그 반대도 마찬가지였습니다.",
        "꼼꼼한 내용과 Miro 도구의 활용은 우리의 역동적인 생각을 적고 지도로 그리는 데 훌륭했습니다.",
        "가장 즐겁게 배운 것은 자연과 퍼실리테이션의 연결이었습니다 — 생태계를 만들어 낸 균류처럼, 우리도 공동체에 기여하는 변화를 만들어야 한다는 것. 제 피드백은 과정을 늘려 핵심 주제로 더 깊이 들어가고 실전 연습을 강조하자는 것입니다. 예를 들어 참가자들이 멘토와 함께 자주 퍼실리테이션을 진행한다면, 실행할 수 있는 도구를 지니고 과정을 마친다는 목표에 더 가까워질 것입니다.",
        "퍼실리테이션 질문들에는, 우리 각자의 맥락에 맞게 어조와 문구를 바꾸는 방법에 대한 안내가 있었다면 유용했을 것입니다.",
        "이 프로그램에서 얻은 것은 많습니다! 가장 큰 것은 동생들에 대한 더 깊은 이해, 그리고 오늘의 세상에서 청년들이 신앙을 몸에 익히며 마주하는 어려움 — 동시에 신앙을 따르고 창조주를 삶의 나침반으로 의지하며 얻는 커다란 유익에 대한 이해였습니다.",
        "질문을 던지고 그들의 관심이 들릴 때까지 기다리는 것이, 직접 다가가는 일방적인 대화보다 훨씬 쓸모 있는 대화를 만든다는 것을 배웠습니다.",
        "바깥에서는 수많은 소셜 임팩트 프로그램을 해 왔지만, 가장 가까운 가족 안의 과제에 구조화된 접근을 쓴 것은 처음이었습니다 — 예컨대 Z세대를 위한 금융 리터러시 앱을 만들 때도, 같은 것을 집에서 해 볼 생각은 이 프로그램 전까지 한 번도 떠오르지 않았습니다.",
        "끝날 무렵, 동생들과 저는 서로의 삶의 목표를 더 깊이 이해하게 되었고 그것을 신앙에 대한 사랑과 나란히 놓게 되었습니다.",
        "또한 가족과 꾸란 교실 자원봉사자들의 도움으로 어린이 기도서를 디자인해 펴냈습니다. 아브라함과 노아 같은 예언자들의 기도, 부모와 지식과 자연에 대한 기도가 활동과 함께 담겨 있습니다. 12월 제 결혼식 답례품으로 선물했는데, 더 큰 규모로 가족에게 유익했고, 더 많은 이들을 돕도록 출판하고 싶습니다!",
        "패스파인더 프로그램은 자신 너머의 삶의 사명을 찾는 청년, 네트워크를 찾는 공동체의 체인지메이커, 일의 일부로 퍼실리테이션을 맡는 디자이너와 교육자를 위한 도구라고 생각합니다. 사회적 프로젝트를 품고 아이디어를 실행으로 다듬을 방향을 찾는 사람에게 꼭 맞습니다."
      ]
    }
  },
  {
    "id": "mewe-reflection",
    "date": "2022-09-30",
    "format": "writing",
    "topic": "blog",
    "color": "#1E8A86",
    "href": "#",
    "media": {
      "image": null
    },
    "en": {
      "eyebrow": "Pathfinder · 2022",
      "title": "Reflections of a Pathfinder",
      "body": "Two sessions of one Pathfinder cohort: five time zones discovering how closely their hopes aligned, then practising letting go of ego — the flip, from independence to interdependence.",
      "credit": "Rajaa Bokhari",
      "paras": [
        "## IGNITE · September 5, 2022",
        "September 5, 2022 saw the 1st session of the MEWE Pathfinder program by INNOCO, aptly titled “IGNITE” to indicate the start of our journey as facilitators building community in our home country or our homes by choice. And there were plenty of regions in which we can affect change, since the participating members came from 5 different time zones!",
        "But defying expectations, the distance actually emphasized the cohort’s closeness, because we discovered, through an invigorating and introspective exercise in exploring identity, that we all have very similar alignment on our goals and can develop our skills through guidance by the INNOCO team and each other’s experiences.",
        "To understand our identity on multiple facets, we selected “worlds” for ourselves on a shared Miro board where we can record our journey through Pathfinder as we complete each exercise in the program. We were also introduced to the idea of how visualizing our journey as a “pathfinder” for our community can also understand the aspects of this journey that we value the most, which helped “IGNITE” the program!",
        "## (ME WE) · September 30, 2022",
        "As we continue our journey as Pathfinders, we began by engaging with each other over our recent musings by the “Fireside”. We discussed what we would like to offer in this new session, and what was rooted behind our intention for the day. It was a great self-reflective as well as community-affirming exercise that was perfectly in line with the theme of the session [ME WE] on recognizing and acknowledging our interdependence with our community.",
        "We are able to contrast this interdependence from the much more individual-centric “independence”, from where we needed to transition on the Pathfinder journey by letting go of our ego. On the Möbius strip, this is signified by the FLIP as we shift our paradigm to interconnectedness.",
        "Some of us explored our challenges using the Pathfinder compass, which we discussed with the facilitators and addressed the strengths and weaknesses of the various tools that we used, which enable us to see through some perspectives, but it is important for us to see that any tool has its limitations and should not be used to fix us within one viewpoint.",
        "As the Pathfinder journey continues, we can see us shift between the different compass paradigms, which is also a significant part of our story. Our session concluded with a meditation on letting go so we could experience the sensation of “oneness” with our community."
      ]
    },
    "ko": {
      "eyebrow": "패스파인더 · 2022",
      "title": "어느 패스파인더의 회고",
      "body": "한 패스파인더 기수의 두 세션: 다섯 시간대의 사람들이 서로의 바람이 얼마나 닮았는지 발견하고, 에고를 내려놓는 연습을 했습니다 — 독립에서 상호의존으로의 뒤집기.",
      "credit": "Rajaa Bokhari",
      "paras": [
        "## IGNITE · 2022년 9월 5일",
        "2022년 9월 5일, INNOCO의 MEWE 패스파인더 프로그램 첫 세션이 열렸습니다. ‘IGNITE’라는 이름 그대로 — 고국에서든, 선택한 삶의 터전에서든 공동체를 세우는 퍼실리테이터로서의 여정의 시작이었습니다. 참가자들이 다섯 개의 시간대에서 모였으니, 변화를 만들 수 있는 지역도 그만큼 많았습니다!",
        "그런데 예상과 달리, 거리는 오히려 우리의 가까움을 도드라지게 했습니다. 정체성을 탐구하는 활기차고 성찰적인 연습을 통해, 우리 모두의 목표가 아주 비슷하게 정렬되어 있으며 INNOCO 팀의 안내와 서로의 경험으로 역량을 키워 갈 수 있음을 발견했기 때문입니다.",
        "여러 면에서 정체성을 이해하기 위해, 우리는 공유 Miro 보드에 각자의 ‘세계’를 골라 프로그램의 연습을 마칠 때마다 패스파인더 여정을 기록했습니다. 공동체를 위한 ‘패스파인더’로서의 여정을 시각화하는 것이 이 여정에서 우리가 가장 소중히 여기는 면들을 이해하게 해 준다는 생각도 소개받았고, 그것이 프로그램에 불을 붙였습니다!",
        "## (ME WE) · 2022년 9월 30일",
        "패스파인더로서의 여정을 이어가며, 우리는 ‘모닥불 가’에서 근래의 생각들을 나누는 것으로 시작했습니다. 이 새 세션에서 무엇을 내어놓고 싶은지, 오늘의 의도 뒤에 무엇이 뿌리내려 있는지 이야기했습니다. 공동체와의 상호의존을 알아차리고 인정한다는 세션의 주제 [ME WE]와 꼭 맞는, 자기 성찰이자 공동체를 확인하는 훌륭한 연습이었습니다.",
        "이 상호의존을 훨씬 개인 중심적인 ‘독립’과 견주어 볼 수 있었습니다. 패스파인더 여정에서 우리는 에고를 내려놓으며 그곳으로부터 옮겨 가야 했습니다. 뫼비우스 띠 위에서 이것은 FLIP — 상호연결로 패러다임을 전환하는 순간 — 으로 표시됩니다.",
        "몇몇은 패스파인더 나침반으로 각자의 과제를 탐구했고, 퍼실리테이터들과 함께 우리가 쓴 여러 도구의 강점과 약점을 짚었습니다. 도구는 어떤 관점을 꿰뚫어 보게 해 주지만, 어떤 도구든 한계가 있으며 우리를 하나의 시점 안에 고정하는 데 쓰여서는 안 된다는 것을 보는 일이 중요했습니다.",
        "패스파인더 여정이 이어지며, 우리는 서로 다른 나침반 패러다임 사이를 오가는 자신을 봅니다. 그것 또한 우리 스토리의 중요한 부분입니다. 세션은 공동체와의 ‘하나됨’을 감각할 수 있도록 내려놓음에 대한 명상으로 마무리되었습니다."
      ]
    }
  },
  {
    "id": "importance-of-connection",
    "date": "2022-09-29",
    "format": "writing",
    "topic": "blog",
    "color": "#F0961E",
    "href": "#",
    "media": {
      "image": null
    },
    "en": {
      "eyebrow": "Pathfinder · 2022",
      "title": "“Now I can see the importance of connection”",
      "body": "A participant describes a meditation on letting go — and the moment ME+WE stopped being an idea.",
      "credit": "Fr. Akhil Abrahim",
      "paras": [
        "The session today has really evoked a lot of deep thought. To begin with was the whole concept — or you can say the confusion that I had — of connection with the other. But to my surprise, the meditation about dying to self, letting go, fear of failure and the willingness to let go put things in perspective and brought about an understanding of the whole ‘me + we’ idea, and I can now see the importance of connection."
      ]
    },
    "ko": {
      "eyebrow": "패스파인더 · 2022",
      "title": "“이제 연결의 소중함이 보여요”",
      "body": "한 참가자가 내려놓음에 대한 명상을 들려줍니다 — ME+WE가 관념이기를 멈춘 순간을.",
      "credit": "Fr. Akhil Abrahim",
      "paras": [
        "오늘 세션은 정말 많은 깊은 생각을 불러일으켰습니다. 처음엔 타인과의 연결이라는 개념 전체 — 혹은 제가 가졌던 혼란이라고 해도 좋겠습니다 — 에서 시작했습니다. 그런데 놀랍게도, 자기를 내려놓는 것, 실패의 두려움, 놓아 보내려는 마음에 대한 명상이 모든 것을 제자리에 놓아 주었고 ‘me + we’라는 생각 전체를 이해하게 해 주었습니다. 이제 연결의 소중함이 보입니다."
      ]
    }
  },
  {
    "id": "shy-to-leading",
    "date": "2018-09-03",
    "format": "writing",
    "topic": "lived",
    "color": "#1A2230",
    "href": "#",
    "media": {
      "image": "story-img/driver.jpg"
    },
    "en": {
      "eyebrow": "I lived it · Sarlahi, Nepal",
      "title": "My father spent it on the village",
      "body": "He was a driver with savings meant for his daughters. He built a youth club instead — and took her with him.",
      "credit": "Pabitra Majhi",
      "paras": [
        "My name is Pabitra Majhi. I am a very simple, kind and funny girl whose happiness is found in small things like dancing, taking photographs and travelling, but in the past few years I have also become an enthusiastic and energetic youth activist. I am pursuing a master’s degree in Economics at Patan Multiple Campus, Kathmandu and am very passionate in activating positive social change and youth empowerment in my country.",
        "Working as a Programme Officer of a youth-led NGO, Girls Empowered by Travel – Nepal, I am developing my pathway to become a changemaker.",
        "In my society, educating a daughter was not considered important. Many people believed a girl was the property of her in-laws. My father never thought that way. He is a driver, and he gave me as much education as he could afford. He also gave away what he had: the money he saved for our future, he spent instead on the education and development of the Majhi community, and he established our Majhi Community Youth Club in Sarlahi.",
        "He took me there many times so I could learn on site. I am the first girl from my village to receive higher education.",
        "I am driven to be an effective social entrepreneur and contribute to the economic development of the nation. Looking for good opportunities or a platform where I could enhance my knowledge, skills and explore my potentialities led me to UAE/NEPAL/CONNECT (UNC) 2016. This became one of my major turning points, where I got the opportunity to transform myself from something to many things.",
        "Through the five days of the SE training program with INNOCO and Leadership Corner, I was able to explore my inner hero self and understand better the changemaker I wanted to be for my own community, and how to begin contributing to society in different ways. This event built up my confidence and motivated me to seek more people with like-minded qualities.",
        "I began working with an NGO, Helvetas Swiss Intercooperation Nepal, that helped me gain further knowledge on setting up a social entrepreneurship and understanding deeper the problems the people are facing. I began to see that girl and women empowerment was an area I was passionate about and began to take steps to work with this cause.",
        "In Feb 2017, the Nepal Youth Cluster (NYC) that was initiated at the UNC2016 program was working towards the UNC2017 bootcamp, and I was selected as the Assistant Program Coordinator to organize this 9-day entrepreneurship boot camp where 18 Nepalese youth from diverse backgrounds participated to transform themselves as social innovators.",
        "Through my hard work and commitment, the INNOCO team, based at Zayed University, Dubai, gave me a great opportunity to work as a Research Assistant for the SE research paper and documentary feature that they were producing in light of the UNC programs.",
        "A few years ago, I was a very shy person and could not express my views and thoughts in front of other people, but with the guidance and encouragement from Joanne and Yunsun, I am growing up as a social changemaker. Later in 2017, I became one of the winners of EmpowHER 2017 organized by Ujyalo Foundation, where I won half seed fund to accelerate my dream SE project Saahasi – The Brave Women in my hometown Sarlahi.",
        "Based on empathy-driven motives, this helped 10 women get basic education, and I am currently doing research and seeking possible collaborations for these women to establish small micro enterprises based on local resources and be the example for other women.",
        "In addition, I am also a U.S. Embassy Youth Council Member for 2018, which is enabling my network growth and fostering engagement with 50 youth members from diverse backgrounds to share our skills and knowledge. Recently, I along with my team successfully conducted training programmes for elected women of local government of Bhaktapur and Lalitpur to enhance and ensure the establishment of their meaningful participation in local development.",
        "Since the UNC programs, NYC has reformed and registered as the Nepal Youth Innovators (NGO), of which I was selected as a Vice President of the board members.",
        "My mission is to ensure girls and women education in Nepal so that women are empowered to create opportunities for good leadership and equity in our nation. I don’t have a big dream. I believe a small change makes a huge difference if we work collectively."
      ]
    },
    "ko": {
      "eyebrow": "내가 살아낸 것 · 사를라히, 네팔",
      "title": "아버지는 그 돈을 마을에 썼습니다",
      "body": "딸들을 위해 모아 둔 돈이 있던 운전기사였습니다. 그는 대신 청년 클럽을 지었고 — 딸을 데리고 갔습니다.",
      "credit": "Pabitra Majhi",
      "paras": [
        "제 이름은 파비트라 마지입니다. 춤추기, 사진 찍기, 여행 같은 작은 것들에서 행복을 찾는 아주 단순하고 다정하고 웃긴 사람이지만, 지난 몇 년 사이 열정적이고 에너지 넘치는 청년 활동가가 되기도 했습니다. 카트만두 파탄 멀티플 캠퍼스에서 경제학 석사 과정을 밟고 있으며, 나라의 긍정적인 사회 변화와 청년 임파워먼트에 불을 붙이는 일에 열심입니다.",
        "청년이 이끄는 NGO ‘Girls Empowered by Travel – Nepal’의 프로그램 오피서로 일하며, 체인지메이커가 되는 저만의 길을 만들어 가고 있습니다.",
        "제가 자란 사회에서 딸을 교육하는 일은 중요하게 여겨지지 않았습니다. 많은 이들이 딸은 시댁의 소유라고 믿었습니다. 아버지는 한 번도 그렇게 생각하지 않으셨습니다. 운전기사인 아버지는 형편이 닿는 만큼 저를 가르치셨습니다. 그리고 가진 것을 내어놓으셨습니다: 우리의 미래를 위해 모아 둔 돈을 마지 공동체의 교육과 발전에 쓰셨고, 사를라히에 마지 커뮤니티 유스 클럽을 세우셨습니다.",
        "아버지는 제가 현장에서 배울 수 있도록 여러 번 저를 데리고 가셨습니다. 저는 우리 마을에서 고등교육을 받은 첫 번째 여자입니다.",
        "저는 유능한 사회적 기업가가 되어 나라의 경제 발전에 기여하고 싶습니다. 지식과 기술을 키우고 가능성을 탐구할 기회와 플랫폼을 찾다가 UAE/NEPAL/CONNECT(UNC) 2016을 만났습니다. 그것은 제 삶의 큰 전환점 중 하나가 되었고, 하나였던 저를 여러 가지로 바꿀 기회를 주었습니다.",
        "INNOCO와 리더십 코너가 함께한 닷새의 사회적 기업 훈련을 통해 내면의 영웅을 탐구했고, 내 공동체를 위해 되고 싶은 체인지메이커가 어떤 모습인지, 사회에 기여하는 여러 방법을 어떻게 시작할지 더 잘 이해하게 되었습니다. 이 경험은 자신감을 키워 주었고, 뜻이 맞는 사람들을 더 찾아 나서게 했습니다.",
        "이후 NGO 헬베타스 스위스 인터코퍼레이션 네팔과 일하며 사회적 기업 설립에 대한 지식을 더 얻고 사람들이 겪는 문제를 더 깊이 이해하게 되었습니다. 소녀와 여성의 임파워먼트가 제가 열정을 가진 영역임을 보게 되었고, 이 대의를 위해 걸음을 떼기 시작했습니다.",
        "2017년 2월, UNC2016에서 시작된 네팔 유스 클러스터(NYC)가 UNC2017 부트캠프를 준비하고 있었고, 저는 보조 프로그램 코디네이터로 뽑혀 다양한 배경의 네팔 청년 18명이 사회 혁신가로 거듭난 9일간의 기업가정신 부트캠프를 조직했습니다.",
        "저의 노력과 헌신을 보고, 두바이 자이드 대학교의 INNOCO 팀은 UNC 프로그램에 대해 제작 중이던 사회적 기업 연구 논문과 다큐멘터리의 연구 조교로 일할 큰 기회를 주었습니다.",
        "몇 년 전의 저는 몹시 수줍어 다른 사람들 앞에서 생각을 말하지 못하는 사람이었지만, 조앤과 윤선의 안내와 격려로 사회적 체인지메이커로 자라고 있습니다. 2017년 말에는 우절로 재단의 EmpowHER 2017 수상자가 되어, 고향 사를라히에서 꿈의 프로젝트 ‘사하시 – 용감한 여성들’을 가속할 시드 펀드의 절반을 받았습니다.",
        "공감에서 출발한 이 일은 열 명의 여성이 기초 교육을 받도록 도왔고, 지금은 이 여성들이 지역 자원에 기반한 소규모 사업을 세워 다른 여성들의 본보기가 되도록 연구하며 협력의 가능성을 찾고 있습니다.",
        "또한 2018년 주네팔 미국대사관 청년 자문단으로 활동하며 다양한 배경의 청년 50명과 기술과 지식을 나누고 네트워크를 키우고 있습니다. 최근에는 팀과 함께 박타푸르와 랄릿푸르 지방정부의 선출직 여성들을 위한 훈련 프로그램을 성공적으로 진행해, 지역 발전에 의미 있게 참여할 수 있는 기반을 다졌습니다.",
        "UNC 프로그램 이후 NYC는 네팔 유스 이노베이터스(NGO)로 재편되어 등록되었고, 저는 이사회 부의장으로 선출되었습니다.",
        "저의 사명은 네팔의 소녀와 여성이 교육받게 하여, 여성들이 좋은 리더십과 형평의 기회를 만들어 갈 힘을 얻게 하는 것입니다. 저에게 큰 꿈은 없습니다. 함께 일한다면 작은 변화가 커다란 차이를 만든다고 믿습니다."
      ]
    }
  },
  {
    "id": "homestay",
    "date": "2017-08-21",
    "format": "writing",
    "topic": "lived",
    "color": "#2E2018",
    "href": "#",
    "media": {
      "image": "story-img/village.jpg",
      "fit": "contain"
    },
    "en": {
      "eyebrow": "I lived it · Changunarayan, Nepal",
      "title": "The work that isn't counted",
      "body": "Her village is a World Heritage Site. The women who hold it together don’t appear in any figure.",
      "credit": "Sajana Bhadel",
      "paras": [
        "I am Sajana Bhadel, born and brought up in a small village, Changunarayan. I always felt blessed to live here. Changunarayan is a small village where the majority of people are categorized in a marginalized group. I am the Chairperson of Girls Empowered by Travel.",
        "My village is truly beautiful. Changunarayan has also been a home of Lord Bishnu since ancient times. It is listed in the world heritage site because of its pristine beauty and traditional pagoda style. The greenery, pine forest, wide range of mountains and a perfect view of the valley from the top of the hill — where diverse cultural and traditional festivals and traditional lifestyle are well-integrated, and hospitable and lovely people — are the major attractions of this village.",
        "However, one-third of the people of the village are still living below the poverty line in spite of the potential to be otherwise. Agriculture is the main source of income, which is practiced in the traditional style. So people are living in subsistence farming, which isn’t of high-value crops.",
        "In addition, our social structure is male-dominated, where women are undoubtedly the backbone of the society but unfortunately their services and activities aren’t counted in GDP.",
        "More than half of the women are engaged in agriculture. Women and girls have been suffering from different health and psychological issues. Early marriage, prolapsed uterus, miscarriage, and economic dependency are major causes for a girl to be prone to be easily victimized.",
        "The role of women in society has slowly revolutionized; women/girls are sent to school and they even get higher education. But when they are ready to land the perfect job, their parents force them to get married. In the case of a daughter-in-law, they are given the role to take care of household chores, bear the child and take care of the babies.",
        "They never get time to leave the house and contribute in the economic sector though they are capable. However, some of these are preventable problems in our society.",
        "I somehow got the opportunity to attend the 9-day boot camp, which was organized by INNOCO/UAE-Youth Cluster in the ICA training center. I thought myself lucky to be part of the program. The program was all about social innovation, win-win ideas. During the workshop, I felt every day was full of surprises; every moment energized us and brought us near to our own true potential.",
        "“MEWE” was the most interesting and important lesson we learned. The field visit at Patale Gaun Organic Farm, in order to know the food system and the importance of organic food, was an unforgettable heartfelt moment.",
        "Every participant had to pitch the project on the last day; we were asked to choose the topic three days earlier. I couldn’t sleep the whole night for three days. There were so many ideas which were bursting out, but finally I had this homestay idea. Our program director Yunsun, program facilitator Joanne and Sarah polished my ideas.",
        "These lovely people assisted me to think about the critical ingredients of making a social enterprise attractive and feasible.",
        "Being a student of Economics, uplifting the economic status of my village is always a high priority of my life. So I am trying my best to bring my dream project into reality.",
        "‘Champak Namuna Home’ is a homestay social enterprise. What is a homestay? A ‘homestay’ is simply where guests stay in a local villager’s home, where they get to partake in the activities of the house and village, instead of being put up in a lodge or hotel. Guests are invited to the house as family members by the host family and get a chance to spend time with them, participating in any home activities and observing their customs, values, and culture.",
        "Homestay can be an excellent tool for the reduction of rural poverty and empowerment of the local community, for those who are marginalized and vulnerable — especially brilliant women with full potential. It integrates all activities of tourism like trekking, cultural and eco-tourism. In this project, we will provide these activities, as well as focus on all aspects of women’s issues.",
        "I am grateful to all the INNOCO team and all the facilitators — they were always our guardians, and I hope to meet them again to learn and share."
      ]
    },
    "ko": {
      "eyebrow": "내가 살아낸 것 · 창구나라얀, 네팔",
      "title": "셈해지지 않는 일",
      "body": "그녀의 마을은 세계문화유산입니다. 그 마을을 지탱하는 여성들은 어떤 통계에도 나오지 않습니다.",
      "credit": "Sajana Bhadel",
      "paras": [
        "저는 사자나 바델입니다. 창구나라얀이라는 작은 마을에서 나고 자랐고, 이곳에 사는 것을 늘 축복으로 느꼈습니다. 창구나라얀은 주민 대다수가 소외 계층으로 분류되는 작은 마을입니다. 저는 ‘Girls Empowered by Travel’의 의장입니다.",
        "우리 마을은 정말 아름답습니다. 창구나라얀은 아주 오래전부터 비슈누 신의 거처였고, 그 순수한 아름다움과 전통 파고다 양식으로 세계문화유산에 올라 있습니다. 초록의 들과 소나무 숲, 넓게 펼쳐진 산줄기, 언덕 꼭대기에서 내려다보는 계곡의 완벽한 풍경 — 다양한 문화와 전통 축제, 전통적인 삶의 방식이 잘 어우러져 있고, 따뜻하고 사랑스러운 사람들이 있는 곳 — 이것이 이 마을의 큰 매력입니다.",
        "그러나 그렇지 않을 수 있는 잠재력에도 불구하고, 마을 사람 3분의 1은 여전히 빈곤선 아래에서 삽니다. 주된 소득원은 농업이지만 전통 방식 그대로여서, 사람들은 고부가가치 작물이 아닌 자급 농사로 살아갑니다.",
        "게다가 우리의 사회 구조는 남성 중심입니다. 여성은 의심할 여지 없이 사회의 등뼈이지만, 안타깝게도 그들의 봉사와 활동은 GDP에 셈해지지 않습니다.",
        "여성의 절반 이상이 농사를 짓습니다. 여성과 소녀들은 여러 건강 문제와 심리적 어려움을 겪어 왔습니다. 조혼, 자궁 탈출증, 유산, 경제적 의존은 소녀가 쉽게 피해자가 되는 주요 원인입니다.",
        "사회에서 여성의 역할은 천천히 달라져 왔습니다. 소녀들은 학교에 가고 고등교육까지 받습니다. 하지만 꼭 맞는 일자리를 잡을 준비가 되었을 때, 부모는 결혼을 강요합니다. 며느리가 되면 집안일을 맡고, 아이를 낳고, 아이를 돌보는 역할이 주어집니다.",
        "능력이 있어도 집을 떠나 경제 부문에 기여할 시간은 결코 주어지지 않습니다. 그러나 이 중 일부는 우리 사회가 막을 수 있는 문제입니다.",
        "저는 INNOCO/UAE 유스 클러스터가 ICA 훈련 센터에서 연 9일간의 부트캠프에 참가할 기회를 얻었습니다. 이 프로그램의 일원이 된 것이 행운이라고 생각했습니다. 프로그램은 온통 사회 혁신과 서로에게 이로운 아이디어에 관한 것이었습니다. 워크숍 내내 매일이 놀라움으로 가득했고, 매 순간이 우리에게 힘을 주며 우리 자신의 진짜 가능성 가까이로 데려갔습니다.",
        "“MEWE”는 우리가 배운 가장 흥미롭고 중요한 가르침이었습니다. 먹거리 시스템과 유기농의 소중함을 알기 위해 찾은 파탈레 가운 유기농장 견학은 잊을 수 없는 뭉클한 순간이었습니다.",
        "마지막 날 모든 참가자는 프로젝트를 발표해야 했고, 사흘 전에 주제를 골라야 했습니다. 사흘 내내 밤잠을 이루지 못했습니다. 터져 나오는 아이디어가 너무 많았지만, 마침내 홈스테이 아이디어가 남았습니다. 프로그램 디렉터 윤선, 퍼실리테이터 조앤과 사라가 제 아이디어를 다듬어 주었습니다.",
        "이 사랑스러운 사람들은 사회적 기업을 매력 있고 실현 가능하게 만드는 핵심 재료를 생각하도록 도와주었습니다.",
        "경제학을 공부하는 학생으로서, 마을의 경제적 형편을 끌어올리는 일은 언제나 제 삶의 높은 우선순위입니다. 그래서 꿈의 프로젝트를 현실로 만들기 위해 최선을 다하고 있습니다.",
        "‘참팍 나무나 홈’은 홈스테이 사회적 기업입니다. 홈스테이란 무엇일까요? 손님이 롯지나 호텔이 아니라 마을 주민의 집에 머물며 집과 마을의 활동에 참여하는 것입니다. 손님은 가족의 일원으로 초대받아 함께 시간을 보내고, 집안의 활동에 참여하며 그들의 관습과 가치와 문화를 지켜봅니다.",
        "홈스테이는 농촌 빈곤을 줄이고 지역 공동체 — 소외되고 취약한 이들, 특히 가능성으로 가득한 눈부신 여성들 — 에게 힘을 주는 훌륭한 도구가 될 수 있습니다. 트레킹, 문화 관광, 생태 관광 같은 관광의 모든 활동을 아우릅니다. 이 프로젝트에서 우리는 이 활동들을 제공하면서 여성 문제의 모든 면에 집중할 것입니다.",
        "INNOCO 팀과 모든 퍼실리테이터에게 감사합니다 — 그들은 언제나 우리의 지킴이였고, 다시 만나 배우고 나눌 수 있기를 바랍니다."
      ]
    }
  },
  {
    "id": "beehive",
    "date": "2017-08-28",
    "format": "writing",
    "topic": "lived",
    "color": "#1C2A21",
    "href": "#",
    "media": {
      "image": "story-img/prototype.jpg",
      "fit": "contain"
    },
    "en": {
      "eyebrow": "I lived it · Dharan, Nepal",
      "title": "Taller than the Eiffel Tower",
      "body": "His first poem, written at eight. His first prototype, abandoned at twenty-one. Both taught the same thing.",
      "credit": "Shashank Pokharel",
      "paras": [
        "Hi! My name is Shashank Pokharel. I am an engineering student pursuing my B.E. in Agricultural Engineering at the Institute of Engineering, Purwanchal Campus. I was born 20 years ago in the city of Dharan, some 380 km south-east of Kathmandu, and have been living here ever since.",
        "I had a really good upbringing in the peaceful vicinity of Vijayapur, a small hill-top in the eastern part of Dharan decorated with greenery and forests and blessed with some famous temples. I used to read a lot of quiz books, and the morning news bulletin of Radio Kantipur used to be my morning alarm.",
        "It is those two things of my childhood — quiz and news — which shaped my path by providing me with almost a googol of information.",
        "Having tons of information also meant being somewhat different from my friends, and I could also cash-in on that information for prizes in weekly phone-in quiz shows in local stations or different competitions in my school. Information is a key to being an entrepreneur, and for me it started at an early age.",
        "The serene nature I grew up in also inspired me to be creative. It started in grade 3 when, with the help of a cousin, I wrote my first poem. He taught me a simple technique — rhyme the last words. “Knowledge is power; it is taller than the Eiffel Tower” is what I wrote in the first stanza.",
        "That was a rather humble beginning which would achieve new heights when, in grade 8, some of my poems started getting published in the weekly ‘Classroom’ section of The Kathmandu Post, Nepal’s best-selling English daily.",
        "Poetry was my way of letting emotions ooze out and showing my creativity. Creativity and being different is a must for any successful entrepreneur, and for beginners like me, rhyming is a way of playing safe until you start thinking like Bob Dylan.",
        "So why do I want to be an entrepreneur? I do not have any concrete answer. I love innovating, researching and thinking out of the box, and even a moment’s thought of a job bores me. Or maybe that comes down in the genes, as my dad is a successful businessman in his own right. Or maybe even a quick thought about some of the successful entrepreneurs like Bill Gates, Elon Musk or Steve Wozniak excites me.",
        "But it is definite that I want to solve existing problems in society in the most innovative way possible and build an enterprise around that solution. Whatever may be the reason, an entrepreneur is what I want to be!",
        "I was more focused on doing engineering projects, and entrepreneurship was just a path I wanted to pursue in the future. But that changed when I participated in the UAE-Nepal Connect 2017 bootcamp, where I gained some valuable insights on social entrepreneurship. With great help from wonderful mentors like Rob, Yunsun, Joanne and Amin, I have devised my own entrepreneurial plans around honey production and beekeeping.",
        "Our project is like an unsolved equation of entrepreneurship and innovation, where both values are unknown but are required to solve the equation or successfully conclude the project. I am working with my team of college friends to create what we call a ChannelHive — an ultra-modern beehive which seemingly is easy to look after and requires much less time to harvest honey from the hive, saving valuable time for farmers.",
        "By adjusting the internal frames, a channel is created inside each cell of the hive when the honey has to be harvested, and honey in each cell of the frames flows below to a pipe, and through the pipe it flows outside the hive.",
        "Apart from an easy way of harvesting, we are also integrating a bit of electronics to constantly regulate the internal temperature of the hive to create a uniform internal temperature suitable for the bees. Since honey production is optimum when the internal temperature is maintained at 32°C to 35°C, heating and cooling elements will be used and operated by a micro-controller, which will be updated about temperature by a temperature sensor present inside the hive.",
        "Since bees only live in natural conditions and leave the hive if they detect anything unnatural, it is a great risk to artificially regulate temperature. But innovators take risks, don’t they?",
        "Our target with this project is to develop an ultra-modern ChannelHive, manufacture it and provide it to farmers at a low price (around or a little more than the widely-used Langstroth Hive). As of now, we are at a very early stage of the project. We have designed a 3-D model of our proposed ChannelHive and have pitched it to an INGO, Helvetas Swiss Intercooperation, for technical and financial support to build a prototype.",
        "Moreover, INNOCO and Helvetas are also helping me and my friend from NYC, Pabitra Majhi, to get certified as Biz Development Service Providers, and post-certification our team API Solutions gets to be implemented as a social enterprise.",
        "This project, although sounding more like an engineering project, has its own socio-economic importance too. At present, Nepal is producing six times less honey than its production capacity, and we are still importing in significant amounts. Since harvesting honey is a very tedious task, commercial beekeeping has not been widely practiced.",
        "Also, difficulty in maintaining a healthy colony during extreme weather and climatic conditions is a big problem.",
        "We are working to simplify beekeeping and save valuable resources and time for farmers. The ultimate aim is to see every farmer using our ChannelHive, inspire youths to consider beekeeping as an economically beneficial enterprise, and make Nepal at least self-reliant on honey.",
        "Moreover, growth in beekeeping is also a positive sign of a good and pollution-free environment — not to mention the fact that bees exist only in a pollution- and chemical-free environment and help in better pollination of crops. The global scope of this project is all about creating simple and easy-to-harvest hives to motivate people to be a ‘backyard beekeeper’ — someone who keeps a hive or two to produce honey for one’s own use.",
        "This will not only be beneficial to the beekeeper but also will help repopulate bees for a cleaner, greener and sustainable environment.",
        "A later note: the materials turned out to be expensive and not environmentally sound, so the hive waits, and I am working on Sisnoo instead, with Nepal’s indigenous crops. One more thing changed. I used to be uncomfortable speaking English. You are reading this."
      ]
    },
    "ko": {
      "eyebrow": "내가 살아낸 것 · 다란, 네팔",
      "title": "에펠탑보다 높이",
      "body": "여덟 살에 쓴 첫 시. 스물한 살에 접은 첫 프로토타입. 둘 다 같은 것을 가르쳐 주었습니다.",
      "credit": "Shashank Pokharel",
      "paras": [
        "안녕하세요! 저는 샤샹크 포카렐입니다. 공과대학 푸르완찰 캠퍼스에서 농업공학 학사 과정을 밟고 있는 공학도입니다. 카트만두에서 남동쪽으로 380km쯤 떨어진 다란에서 20년 전에 태어나 지금까지 살고 있습니다.",
        "다란 동쪽, 초록과 숲으로 꾸며지고 이름난 사원들이 있는 작은 언덕 비자야푸르의 평화로운 동네에서 좋은 어린 시절을 보냈습니다. 퀴즈 책을 많이 읽었고, 라디오 칸티푸르의 아침 뉴스가 제 아침 알람이었습니다.",
        "어린 시절의 그 두 가지 — 퀴즈와 뉴스 — 가 거의 구골에 가까운 정보를 안겨 주며 제 길을 빚었습니다.",
        "정보가 많다는 것은 친구들과 조금 다르다는 뜻이기도 했고, 지역 방송의 주간 전화 퀴즈나 학교 대회에서 그 정보로 상을 타기도 했습니다. 정보는 기업가가 되는 열쇠이고, 저에게 그것은 이른 나이에 시작되었습니다.",
        "제가 자란 고요한 자연은 창의성에도 불을 붙였습니다. 3학년 때 사촌의 도움으로 첫 시를 쓰면서 시작되었습니다. 사촌은 간단한 기술을 가르쳐 주었습니다 — 끝 단어의 운을 맞추는 것. “지식은 힘, 에펠탑보다 높다” — 첫 연에 그렇게 썼습니다.",
        "소박한 시작이었지만, 8학년 때 네팔에서 가장 많이 읽히는 영자지 카트만두 포스트의 주간 ‘Classroom’ 코너에 제 시들이 실리기 시작하면서 새로운 높이에 닿았습니다.",
        "시는 감정을 흘려보내고 창의성을 드러내는 저의 방법이었습니다. 창의성과 남다름은 성공한 기업가의 필수 조건이고, 저 같은 초심자에게 운 맞추기는 밥 딜런처럼 생각하게 되기 전까지 안전하게 노는 방법입니다.",
        "그렇다면 왜 기업가가 되고 싶을까요? 뚜렷한 답은 없습니다. 혁신하고 연구하고 틀 밖에서 생각하는 것을 사랑하고, 취직 생각은 잠깐만 해도 지루해집니다. 아버지가 그 나름의 성공한 사업가이니 유전일 수도 있고, 빌 게이츠나 일론 머스크, 스티브 워즈니악 같은 기업가들을 떠올리기만 해도 설레는 것일 수도 있습니다.",
        "분명한 것은, 사회의 문제를 가장 혁신적인 방법으로 풀고 그 해법을 중심으로 기업을 세우고 싶다는 것입니다. 이유가 무엇이든, 제가 되고 싶은 것은 기업가입니다!",
        "저는 공학 프로젝트에 더 집중했고, 기업가정신은 언젠가 걷고 싶은 길일 뿐이었습니다. 하지만 UAE-네팔 커넥트 2017 부트캠프에 참가해 사회적 기업에 대한 귀한 통찰을 얻으며 달라졌습니다. 롭, 윤선, 조앤, 아민 같은 멋진 멘토들의 큰 도움으로, 꿀 생산과 양봉을 중심으로 저만의 창업 계획을 세웠습니다.",
        "우리 프로젝트는 기업가정신과 혁신이라는, 두 값 모두 미지수이지만 풀어야만 끝나는 방정식과 같습니다. 대학 친구들과 팀을 이루어 ‘채널하이브’를 만들고 있습니다 — 돌보기 쉽고 꿀 수확 시간이 훨씬 적게 들어 농부들의 귀한 시간을 아껴 주는 초현대식 벌통입니다.",
        "내부 프레임을 조정하면 수확할 때 벌집의 각 방 안에 통로가 생기고, 프레임 각 방의 꿀이 아래 파이프로 흘러 파이프를 타고 벌통 밖으로 나옵니다.",
        "쉬운 수확 외에도, 벌에게 알맞은 균일한 내부 온도를 위해 전자 장치를 더하고 있습니다. 내부 온도가 32–35°C로 유지될 때 꿀 생산이 최적이므로, 벌통 안의 온도 센서가 알려 주는 값에 따라 마이크로컨트롤러가 가열·냉각 장치를 작동시킵니다.",
        "벌은 자연 그대로의 조건에서만 살고, 부자연스러운 것을 감지하면 벌통을 떠나기 때문에 온도를 인공적으로 조절하는 것은 큰 위험입니다. 하지만 혁신가는 위험을 감수하는 법이잖아요?",
        "이 프로젝트의 목표는 초현대식 채널하이브를 개발·제조해 널리 쓰이는 랑스트로스 벌통과 비슷하거나 조금 높은 가격으로 농부들에게 제공하는 것입니다. 지금은 아주 초기 단계로, 채널하이브의 3D 모델을 설계해 프로토타입 제작을 위한 기술·재정 지원을 국제 NGO 헬베타스 스위스 인터코퍼레이션에 제안했습니다.",
        "또한 INNOCO와 헬베타스는 저와 NYC의 친구 파비트라 마지가 비즈니스 개발 서비스 제공자 인증을 받도록 돕고 있으며, 인증 후에는 우리 팀 API 솔루션스가 사회적 기업으로 실행됩니다.",
        "공학 프로젝트처럼 들리지만, 이 프로젝트에는 사회경제적 의미도 있습니다. 지금 네팔은 생산 능력의 6분의 1밖에 꿀을 만들지 못하고, 여전히 상당량을 수입합니다. 꿀 수확이 몹시 고된 일이라 상업 양봉이 널리 퍼지지 못했기 때문입니다.",
        "극한의 날씨와 기후 조건에서 건강한 벌 군집을 유지하기 어렵다는 것도 큰 문제입니다.",
        "우리는 양봉을 단순하게 만들어 농부들의 귀한 자원과 시간을 아끼려 합니다. 궁극의 목표는 모든 농부가 채널하이브를 쓰고, 청년들이 양봉을 경제적으로 이로운 사업으로 여기게 하고, 적어도 꿀에서는 네팔이 자립하게 하는 것입니다.",
        "게다가 양봉의 성장은 오염 없는 좋은 환경의 긍정적 신호이기도 합니다 — 벌은 오염과 화학물질이 없는 환경에서만 살며 작물의 수분을 돕기도 하니까요. 이 프로젝트의 세계적 의미는 단순하고 수확하기 쉬운 벌통을 만들어 사람들이 ‘뒷마당 양봉가’ — 자기 몫의 꿀을 위해 한두 통을 치는 사람 — 가 되도록 이끄는 데 있습니다.",
        "이는 양봉가에게 이로울 뿐 아니라, 더 깨끗하고 푸르고 지속가능한 환경을 위해 벌의 개체 수를 되살리는 데도 도움이 될 것입니다.",
        "훗날의 덧붙임: 재료가 비싸고 환경에도 좋지 않은 것으로 드러나 벌통은 기다리는 중이고, 대신 네팔 토종 작물로 시스누를 만들고 있습니다. 달라진 것이 하나 더 있습니다. 저는 영어로 말하는 것이 불편한 사람이었습니다. 지금 당신이 이 글을 읽고 있네요."
      ]
    }
  },
  {
    "id": "kulna-garden",
    "date": "2021-11-23",
    "format": "writing",
    "topic": "lived",
    "color": "#1A2230",
    "href": "#",
    "media": {
      "image": "story-img/garden-lead.jpg",
      "ratio": "4/3",
      "pos": "center top"
    },
    "en": {
      "eyebrow": "I lived it · Zayed University, UAE",
      "title": "Trying to find my place",
      "body": "A visual art student walked into a garden project to see what it was. She stayed three years and built a food forest.",
      "credit": "Almanar Al Bastaki",
      "paras": [
        "I am just trying to find my place in the world.",
        "That is what Almanar said about herself, a final-year visual arts student in the College of Art and Creative Enterprises at Zayed University, who had been invited to help with a garden on campus and wasn’t sure yet what she was doing there.",
        "She worked with the KULNA community garden project at ZU as a research assistant, and assisted in teaching, building the food forest, community outreach, youth recruitment, and social media planning from 2017–2020. She was able to co-design various activities and campaigns to raise awareness of sustainability through nature-based engagement in the garden.",
        "She designed the campaigns that brought others in, which is a different skill from being brought in yourself.",
        "She engaged in INNOCO in the 2018 Reunion to learn and exchange her experience with Nepali youth, wanting, as she put it, to learn how things run there — the people, the culture, the business, the stories.",
        "Her commitment and leadership inspired so many students and wider community members to envision the future KULNA impact for the UAE and the planet. The sentence she started with was true, and she never withdrew it. She was looking for her place. It turned out that looking for it and making it for other people were the same activity."
      ]
    },
    "ko": {
      "eyebrow": "내가 살아낸 것 · 자이드 대학교, UAE",
      "title": "내 자리를 찾아서",
      "body": "시각예술을 배우던 학생이 무엇인지 궁금해 정원 프로젝트에 들어섰습니다. 3년을 머물렀고, 먹거리 숲을 지었습니다.",
      "credit": "Almanar Al Bastaki",
      "paras": [
        "저는 그저 세상에서 제 자리를 찾으려는 중이에요.",
        "알마나르는 자신을 그렇게 말했습니다. 자이드 대학교 예술창작대학의 시각예술 졸업반 학생이던 그녀는 캠퍼스 정원 일을 도와 달라는 초대를 받았고, 자신이 거기서 무엇을 하고 있는지 아직 알지 못했습니다.",
        "그녀는 2017년부터 2020년까지 자이드 대학교 KULNA 커뮤니티 가든 프로젝트에서 연구 조교로 일하며 수업 보조, 먹거리 숲 조성, 지역 아웃리치, 청년 모집, 소셜 미디어 기획을 도왔습니다. 정원에서의 자연 기반 참여를 통해 지속가능성에 대한 인식을 높이는 다양한 활동과 캠페인을 함께 디자인했습니다.",
        "그녀는 다른 이들을 불러들이는 캠페인을 디자인했습니다 — 자신이 불려 들어가는 것과는 다른 종류의 능력입니다.",
        "2018년 리유니언에서 INNOCO에 함께하며 네팔 청년들과 경험을 배우고 나눴습니다. 그녀의 말로는, 그곳의 사람과 문화와 일과 스토리가 어떻게 굴러가는지 배우고 싶어서였습니다.",
        "그녀의 헌신과 리더십은 수많은 학생과 지역 사람들이 UAE와 지구를 위한 KULNA의 미래를 그리도록 이끌었습니다. 그녀가 처음 꺼낸 문장은 참이었고, 그녀는 그 말을 거둔 적이 없습니다. 자기 자리를 찾고 있었던 것입니다. 알고 보니 자리를 찾는 일과 다른 사람들을 위해 자리를 만드는 일은 같은 활동이었습니다."
      ]
    }
  },
  {
    "id": "shopkeeper",
    "date": "2016-08-01",
    "format": "writing",
    "topic": "noticed",
    "color": "#241C15",
    "href": "#",
    "media": {
      "image": "story-img/shopkeeper-2.jpg",
      "fit": "contain",
      "ratio": "1/1"
    },
    "en": {
      "eyebrow": "I noticed it · Parphing, Nepal",
      "title": "If someone can teach us",
      "body": "The power cuts out most afternoons in Parphing. A shopkeeper decided what to do with the hours it left him.",
      "credit": "Shahadev Balami",
      "paras": [
        "The power goes out in Parphing most afternoons. Shahadev Balami keeps the stationery shop there, and the children who come in call him uncle. When the electricity stops the shop stops with it, and what’s left is hours.",
        "He could spend them the way most men in the village do. Instead he goes out with the local yogis and builds houses for the old people who have no one to build for them.",
        "We stood in his shop and talked about that — about all the do-nothing time a village accumulates, and what it might become. Edible gardens. Community compost. Solar, so the afternoons stop emptying out in the first place.",
        "He didn’t say it was a good idea. He said: if someone can teach us, we are willing to learn.",
        "He was not waiting to be inspired. He was waiting to be shown. The willingness was already sitting there, in a shop with the lights off."
      ]
    },
    "ko": {
      "eyebrow": "내가 알아차린 것 · 파르핑, 네팔",
      "title": "누군가 가르쳐 줄 수 있다면",
      "body": "파르핑에서는 오후마다 전기가 끊깁니다. 한 가게 주인은 남겨진 그 시간으로 무엇을 할지 결정했습니다.",
      "credit": "Shahadev Balami",
      "paras": [
        "파르핑에서는 오후마다 전기가 나갑니다. 샤하데브 발라미는 그곳에서 문구점을 하고, 들어오는 아이들은 그를 아저씨라고 부릅니다. 전기가 멈추면 가게도 함께 멈추고, 남는 것은 시간입니다.",
        "마을의 다른 남자들처럼 그 시간을 보낼 수도 있었습니다. 대신 그는 지역 요기들과 함께 나가, 지어 줄 사람이 없는 어르신들을 위해 집을 짓습니다.",
        "우리는 그의 가게에 서서 그 이야기를 나눴습니다 — 마을에 쌓여 가는 아무것도 하지 않는 시간과, 그것이 무엇이 될 수 있을지. 먹을 수 있는 정원. 마을 퇴비. 그리고 애초에 오후가 비어 버리지 않도록, 태양광.",
        "그는 좋은 생각이라고 말하지 않았습니다. 이렇게 말했습니다: 누군가 가르쳐 줄 수 있다면, 우리는 배울 마음이 있습니다.",
        "그는 영감을 기다리는 것이 아니라, 보여 주기를 기다리고 있었습니다. 그 마음은 이미 거기, 불 꺼진 가게 안에 앉아 있었습니다."
      ]
    }
  },
  {
    "id": "birthday",
    "date": "2016-07-31",
    "format": "writing",
    "topic": "noticed",
    "color": "#1C2A21",
    "href": "#",
    "media": {
      "image": "story-img/birthday.jpg"
    },
    "en": {
      "eyebrow": "I noticed it · Pasa Yard, Nepal",
      "title": "The night the camp became a family",
      "body": "Eighteen strangers, three days in. One of them had a birthday. Nobody organised what happened next.",
      "credit": "UNC2016",
      "paras": [
        "At Pasa Yard we introduced a jar. Before every meal, each person wrote on a slip of paper one thing they were grateful for, and only then could they eat. By the third day nobody was writing quickly anymore.",
        "That same week they wrote their own rules for the camp and named the place Land of Pariwartan — Land of Transformation. They built their inner hero out of Lego. They drew their lives on paper plates and stood in a circle and introduced themselves.",
        "Then the evening came, and someone let slip that it was a participant’s birthday.",
        "Nobody on the team suggested anything. Eighteen young people who had been strangers seventy-two hours earlier pooled what little they had and produced a cake, decorations, gifts, music, and dancing — full Nepali style, well past a reasonable hour.",
        "We had been teaching MEWE all week with strips of paper and diagrams. That night they stopped needing the diagram."
      ]
    },
    "ko": {
      "eyebrow": "내가 알아차린 것 · 파사 야드, 네팔",
      "title": "캠프가 가족이 된 밤",
      "body": "낯선 열여덟 명, 사흘째. 그중 한 명의 생일이었습니다. 그다음에 일어난 일은 아무도 계획하지 않았습니다.",
      "credit": "UNC2016",
      "paras": [
        "파사 야드에서 우리는 유리병 하나를 소개했습니다. 매 식사 전, 각자 감사한 것 하나를 종이에 적어야만 먹을 수 있었습니다. 사흘째가 되자 아무도 빨리 쓰지 않았습니다.",
        "같은 주에 그들은 캠프의 규칙을 직접 쓰고, 그곳에 ‘파리와르탄의 땅’ — 변화의 땅 — 이라는 이름을 붙였습니다. 레고로 내면의 영웅을 지었고, 종이 접시에 자신의 삶을 그려 원을 이루고 서서 자신을 소개했습니다.",
        "그리고 저녁이 왔고, 누군가 한 참가자의 생일이라는 것을 흘렸습니다.",
        "운영팀은 아무것도 제안하지 않았습니다. 72시간 전만 해도 낯선 사이였던 열여덟 명의 청년들이 가진 것을 조금씩 모아 케이크와 장식과 선물과 음악과 춤을 만들어 냈습니다 — 완전한 네팔식으로, 적당한 시간을 훌쩍 넘겨서.",
        "우리는 일주일 내내 종이 띠와 도표로 MEWE를 가르치고 있었습니다. 그날 밤, 그들에게 도표는 더 이상 필요하지 않았습니다."
      ]
    }
  },
  {
    "id": "encouragement",
    "date": "2017-09-01",
    "format": "writing",
    "topic": "noticed",
    "color": "#241C15",
    "href": "#",
    "media": {
      "image": "story-img/encouragement.jpg",
      "fit": "contain"
    },
    "draft": true,
    "en": {
      "eyebrow": "I noticed it · Nepal",
      "title": "More than her words",
      "body": "She was unemployed and poor, and thought encouragement was the only thing she had to give.",
      "credit": "Jyoti",
      "paras": [
        "Jyoti came to the bootcamp already helping people. That was never the problem. She was unemployed and very poor, and what she felt able to offer was encouragement — showing up, saying the right thing.",
        "What she learned over nine days was almost embarrassingly practical: an enterprise can be started with very little money. A business model is something an ordinary person can draw.",
        "She went home and planted kiwi with her family. Seventy thousand rupees, which for her is everything. She is not trying to get rich from it. She is trying to prove that kiwi will grow here, so that the next family in her village doesn’t have to gamble to find out.",
        "The change in her was not a business plan. It was the discovery that she had more than her words to offer."
      ]
    },
    "ko": {
      "eyebrow": "내가 알아차린 것 · 네팔",
      "title": "그녀의 말보다 더 많은 것",
      "body": "일자리도 돈도 없던 그녀는, 줄 수 있는 것이 격려뿐이라고 생각했습니다.",
      "credit": "조티",
      "paras": [
        "조티는 이미 사람들을 돕는 사람으로 부트캠프에 왔습니다. 그것이 문제였던 적은 없습니다. 일자리도 없고 몹시 가난했던 그녀가 줄 수 있다고 느낀 것은 격려였습니다 — 곁에 있어 주는 것, 맞는 말을 해 주는 것.",
        "아흐레 동안 그녀가 배운 것은 민망할 만큼 실용적이었습니다: 아주 적은 돈으로도 사업을 시작할 수 있다는 것. 비즈니스 모델은 평범한 사람도 그릴 수 있는 것이라는 것.",
        "그녀는 집으로 돌아가 가족과 키위를 심었습니다. 7만 루피 — 그녀에게는 전부인 돈입니다. 부자가 되려는 것이 아닙니다. 여기서 키위가 자란다는 것을 증명하려는 것입니다. 마을의 다음 가족은 도박하지 않고도 알 수 있도록.",
        "그녀 안에서 달라진 것은 사업 계획이 아니었습니다. 자신에게 말보다 더 많은 것이 있다는 발견이었습니다."
      ]
    }
  }
];
