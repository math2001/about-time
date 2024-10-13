svgo --config svgo.js images_bunched_inkscape.svg --output images.svg
sed -i 's/style="[^"]*"//g' images.svg
