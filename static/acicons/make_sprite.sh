#!/bin/bash

FILES="a10-model.png
      atc2.png
      atc.png
      blimp.png
      ch53e.png
      e3b.png
      fg_carrier.png
      fg_generic_craft.png
      glider.png
      heavyjet.png
      heavy.png
      heli.png
      kc135-model.png
      kc135.png
      ov10.png
      singleprop.png
      smalljet.png
      twinprop.png
      ufo.png"

montage $FILES \
-geometry 40x40+2+2 \
-tile 10x2 \
-background none \
icons.png

cat << EOF > icons.css
.acicon {
  width: 40px;
  height: 40px;
  background-image: url('icons.png');
  background-repeat: no-repeat;
}     
EOF

X=0
Y=0
for f in $FILES; do
  cat << EOF
.acicon-${f%.*} {
  background-position: $((-2 -X*44))px $((-2 -Y*44))px;
}
EOF
X=$((X+1))
if [ $X -gt 9 ]; then
  X=0
  Y=$((Y+1))
fi
done >> icons.css
