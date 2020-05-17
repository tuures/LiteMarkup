# LiteMarkup spec (NOTE: not actively pursued / not in sync with the implementation ATM)

This is the specification for _LiteMarkup_, the Markdown-like markup language. The goal is to define a terse and sufficiently exact syntax that is easy to write for humans but also easy to parse. To provide contrast, the [*CommonMark*](https://spec.commonmark.org/0.29/) specification is over 100 pages printed, and Markdown compilers that aim to conform that must be quite complex.

*LE* ”line ending” = *U+000A* ”\n”\
*EOL* ”end of line” = *LE* or *END-OF-FILE*\
*SPACE* = *U+0020* ” ”\
*TAB* = *U+0009* ”\t”\
*WS* = *SPACE* or *TAB*\

*DOCUMENT* = repeatedMin0(*BLOCK*)
*BLOCK* = *LEAFBLOCK* or *CONTAINERBLOCK* or *PARAGRAPH*
*LEAFBLOCK* = *EMPTY* or *HR* or *HEADING* or *CODEBLOCK*
*CONTAINERBLOCK* = *BLOCKQUOTE* or *ULIST* or *OLIST*

*EMPTY* = repeatedMin0(*WS*) + *EOL*

*HR* = repeatedMin3((*U+002D* ”-”) + repeatedMin0(*SPACE*)) + *EOL*

*HASH* = (*U+0023* ”#”)\
*HEADINGSTART* = (repeatedMin1Max6(*HASH*) ”level”) + *SPACE*\
*HEADING* = *HEADINGSTART* + (repeatedMin0Not(*LE*) ”content”) + *EOL*\

*BACKTICK* = *U+0060* ”`”\
*INFOTEXT* = repeatedMin0Not(*LE* or *BACKTICK*)\
*CODEBLOCKSTART* = (repeatedMin3(*BACKTICK*) ”opening sequence”) + (*INFOTEXT* ”info text”) + *LE*\
*CODEBLOCK* = *CODEBLOCKSTART* + (repeatedMin0Not(”opening sequence") ”content”) +
  (optionally(”opening sequence" + optionally(*WS*) + *EOL*) ”closing sequence”)

*GT* = *U+003E* ”>”\
*BLOCKQUOTE* = repeatedMin1((*GT* + optionally(*SPACE*) ”indent”) + ((repeatedMin0Not(*LE*) + *EOL*) ”content line”))\
Concatenatd ”content line”s of a *BLOCKQUOTE* are further parsed together as *DOCUMENT*. In other words, the *BLOCKQUOTE* with the ”intent”s removed from each line is a *DOCUMENT*.

*LISTLINE* = repeatedMin0Not(*LE*) + repeatedMin1(*EOL*)

*BULLET* = (*U+002D* ”-”) or (*U+002A* ”\*”)\
*ULIST* = repeatedMin1((((*BULLET* + *SPACE*) ”bulletindent") + (*LISTLINE* ”content line”) +
  repeatedMin0(repeat(*SPACE*, ”bulletindent”.length) + (*LISTLINE* ”content line”))) ”content item”)

*ORDINAL* = repeatedMin1Max9(*NUMBER*) + (*U+002E* ”.”)\
*OLIST* = repeatedMin1((((*ORDINAL* + *SPACE*) ”ordinalindent") + (*LISTLINE* ”content line”) +
  repeatedMin0(repeat(*SPACE*, ”ordinalindent”.length) + (*LISTLINE* ”content line”))) ”content item”)

Concatenated ”content line”s of each ”content item” of *ULIST* and *OLIST* are further parsed as *DOCUMENT*s. In other words, each ”content item” is a embedded *DOCUMENT* with leading indent of each line removed.

*PARAGRAPH* = repeatedMin1Not(*LE* + (\
  (repeatedMin0(*WS*) + *EOL*) or \
  *HEADINGSTART* or \
  *GT* or \
  *BULLET* or \
  *ORDINAL* or \
  *CODEBLOCKSTART*\
))

The ”content” of *HEADING* and *PARAGRAPH* is further parsed as *INLINE*

*INLINE* = *TEXT* or *CODESPAN* or *EM* or *STRONG* or *LINK* or *IMAGE* or *BR*
