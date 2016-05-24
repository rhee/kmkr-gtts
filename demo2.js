var gtts=require('./gtts'),
      tts=new gtts('/tmp/gtts-cache');
tts.say('안녕하세요, 아침이 왔습니다. 오늘 날씨는 어떤가요');
