'use strict';

function Guide()
{
  this.el = document.createElement("canvas");
  this.el.id = "guide";
  this.el.width = 640;
  this.el.height = 640;
  this.el.style.width = "320px";
  this.el.style.height = "320px";
  this.show_extras = true;

  this.scale = 2;

  this.start = function()
  {
    this.clear();
    this.update();
  }

  this.update = function(force = false)
  {
    this.clear();

    this.el.getContext('2d').restore();

    if(dotgrid.tool.index == 2){ this.draw_markers() ; this.draw_vertices() }
    this.draw_path(new Generator(dotgrid.tool.layers[2],dotgrid.tool.styles[2]).toString({x:0,y:0},this.scale),dotgrid.tool.styles[2])
    if(dotgrid.tool.index == 1){ this.draw_markers() ; this.draw_vertices() }
    this.draw_path(new Generator(dotgrid.tool.layers[1],dotgrid.tool.styles[1]).toString({x:0,y:0},this.scale),dotgrid.tool.styles[1])
    if(dotgrid.tool.index == 0){ this.draw_markers(); this.draw_vertices() }
    this.draw_path(new Generator(dotgrid.tool.layers[0],dotgrid.tool.styles[0]).toString({x:0,y:0},this.scale),dotgrid.tool.styles[0])

    this.draw_handles()
    this.draw_translation();
    this.draw_cursor();
    this.draw_preview();
    this.draw_cropping_frame();
  }

  this.clear = function()
  {
    this.el.getContext('2d').clearRect(0, 0, this.el.width*this.scale, this.el.height*this.scale);
  }

  this.toggle = function()
  {
    this.show_extras = this.show_extras ? false : true;
    this.update()
  }

  this.resize = function(size)
  {
    let offset = 15
    const oldSize = {
      width: this.el.width / this.scale - 30,
      height: this.el.height / this.scale - 30
    }
    this.el.width = (size.width+offset)*this.scale;
    this.el.height = (size.height+(offset*2))*this.scale;
    this.el.style.width = (size.width+offset)+"px";
    this.el.style.height = (size.height+(offset*2))+"px";
    const newSize = {
      width: size.width - offset,
      height: size.height
    }
    this.fitCroppingFrameToEdges(oldSize, size);
    this.update();
  }

  this.draw_handles = function()
  {
    if(!this.show_extras){ return; }

    for(let segment_id in dotgrid.tool.layer()){
      let segment = dotgrid.tool.layer()[segment_id];
      for(let vertex_id in segment.vertices){
        let vertex = segment.vertices[vertex_id];
        this.draw_handle(vertex);
      }
    }
  }

  this.draw_vertices = function()
  {
    for(let id in dotgrid.tool.vertices){
      this.draw_vertex(dotgrid.tool.vertices[id]);
    }
  }

  this.draw_markers = function()
  {
    if(!this.show_extras){ return; }

    let cursor = {x:parseInt(dotgrid.cursor.pos.x/dotgrid.grid_width),y:parseInt(dotgrid.cursor.pos.y/dotgrid.grid_width)}

    for (let x = dotgrid.grid_x-1; x >= 0; x--) {
      for (let y = dotgrid.grid_y; y >= 0; y--) {
        let is_step = x % dotgrid.block_x == 0 && y % dotgrid.block_y == 0;
        // Color
        let color = is_step ? dotgrid.theme.active.b_med : dotgrid.theme.active.b_low;
        if((y == 0 || y == dotgrid.grid_y) && cursor.x == x+1){ color = dotgrid.theme.active.b_high; }
        else if((x == 0 || x == dotgrid.grid_x-1) && cursor.y == y+1){ color = dotgrid.theme.active.b_high; }
        else if(cursor.x == x+1 && cursor.y == y+1){ color = dotgrid.theme.active.b_high; }

        this.draw_marker({
          x:parseInt(x * dotgrid.grid_width) + dotgrid.grid_width,
          y:parseInt(y * dotgrid.grid_height) + dotgrid.grid_height
        },is_step ? 2.5 : 1.5,color);
      }
    }
  }

  this.draw_marker = function(pos,radius = 1,color)
  {
    let ctx = this.el.getContext('2d');
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.arc(pos.x * this.scale, pos.y * this.scale, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.closePath();
  }

  this.draw_vertex = function(pos, radius = 5)
  {
    let ctx = this.el.getContext('2d');
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.arc((pos.x * this.scale), (pos.y * this.scale), radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = dotgrid.theme.active.f_med;
    ctx.fill();
    ctx.closePath();
  }

  this.draw_handle = function(pos, radius = 6)
  {
    let ctx = this.el.getContext('2d');

    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.lineCap="round";
    ctx.arc(Math.abs(pos.x * -this.scale), Math.abs(pos.y * this.scale), radius+3, 0, 2 * Math.PI, false);
    ctx.fillStyle = dotgrid.theme.active.f_high;
    ctx.fill();
    ctx.strokeStyle = dotgrid.theme.active.f_high;
    ctx.stroke();
    ctx.closePath();

    ctx.beginPath();
    ctx.arc((pos.x * this.scale), (pos.y * this.scale), radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = dotgrid.theme.active.f_low;
    ctx.fill();
    ctx.closePath();

    ctx.beginPath();
    ctx.arc((pos.x * this.scale), (pos.y * this.scale), radius-3, 0, 2 * Math.PI, false);
    ctx.fillStyle = dotgrid.theme.active.f_high;
    ctx.fill();
    ctx.closePath();
  }

  this.draw_path = function(path,style)
  {
    let ctx = this.el.getContext('2d');
    let p = new Path2D(path);

    ctx.strokeStyle = style.color;
    ctx.lineWidth = style.thickness * this.scale;
    ctx.lineCap = style.strokeLinecap;
    ctx.lineJoin = style.strokeLinejoin;

    if(style.fill && style.fill != "none"){
      ctx.fillStyle = style.color
      ctx.fill(p);
    }

    // Dash
    if(style.strokeLineDash){ ctx.setLineDash(style.strokeLineDash); }
    else{ ctx.setLineDash([]); }
    ctx.stroke(p);
  }

  this.draw_translation = function()
  {
    if(!dotgrid.cursor.translation){ return; }

    let ctx = this.el.getContext('2d');

    ctx.beginPath();
    ctx.moveTo((dotgrid.cursor.translation.from.x * this.scale),(dotgrid.cursor.translation.from.y * this.scale));
    ctx.lineTo((dotgrid.cursor.translation.to.x * this.scale),(dotgrid.cursor.translation.to.y * this.scale));
    ctx.lineCap="round";
    ctx.lineWidth = 5;
    ctx.strokeStyle = dotgrid.theme.active.f_low;
    ctx.setLineDash([5,10]);
    ctx.stroke();
    ctx.closePath();

    ctx.setLineDash([]);
    ctx.restore();
  }

  this.draw_cursor = function(pos = dotgrid.cursor.pos,radius = dotgrid.tool.style().thickness-1)
  {
    let ctx = this.el.getContext('2d');

    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.arc(Math.abs(pos.x * -this.scale), Math.abs(pos.y * this.scale), 5, 0, 2 * Math.PI, false);
    ctx.strokeStyle = dotgrid.theme.active.background;
    ctx.stroke();
    ctx.closePath();

    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.arc(Math.abs(pos.x * -this.scale), Math.abs(pos.y * this.scale), clamp(radius,5,100), 0, 2 * Math.PI, false);
    ctx.strokeStyle = dotgrid.theme.active.f_med;
    ctx.stroke();
    ctx.closePath();
  }

  this.draw_preview = function()
  {
    let ctx = this.el.getContext('2d');
    let operation = dotgrid.cursor.operation && dotgrid.cursor.operation.cast ? dotgrid.cursor.operation.cast : null

    if(!dotgrid.tool.can_cast(operation)){ return; }
    if(operation == "close"){ return; }

    let path  = new Generator([{vertices:dotgrid.tool.vertices,type:operation}]).toString({x:0,y:0},2)
    let style = {
      color:dotgrid.theme.active.f_med,
      thickness:2,
      strokeLinecap:"round",
      strokeLinejoin:"round",
      strokeLineDash:[5, 15]
    }
    this.draw_path(path,style)

    ctx.setLineDash([]);
    ctx.restore();
  }

  this.draw_cropping_frame = function() {
    let ctx = this.el.getContext('2d');
    ctx.setLineDash([5, 10])
    ctx.strokeStyle = dotgrid.theme.active.b_low;
    ctx.lineCap="round";
    ctx.lineWidth = 5;
    const vb = dotgrid.tool.viewBox
    // Calculate the frame’s canvas coordinates
    // the canvas is offset by 15px (the grid’s 0:0 is at 15:15) and scaled
    const vbCanvasCoords = [
      (vb[0] + 15) * this.scale, // x
      (vb[1] + 15) * this.scale, // y
      vb[2] * this.scale,        // width
      vb[3] * this.scale         // height
    ]
    // Calculate the handles’ guide coordinates (`draw_handle()` expects coords in that format)
    const vbGuideCoords = [
      vbCanvasCoords[0] / this.scale, // x
      vbCanvasCoords[1] / this.scale, // y
      vbCanvasCoords[2] / this.scale, // width
      vbCanvasCoords[3] / this.scale  // height
    ]
    // Draw the cropping frame
    ctx.strokeRect(vbCanvasCoords[0],vbCanvasCoords[1],vbCanvasCoords[2],vbCanvasCoords[3])
    ctx.setLineDash([0])
    // Draw the frame’s handles
    this.draw_handle({x:vbGuideCoords[0],y:vbGuideCoords[1]}) // top left
    this.draw_handle({x:vbGuideCoords[2] + vbGuideCoords[0],y:vbGuideCoords[1]}) // top right
    this.draw_handle({x:vbGuideCoords[2] + vbGuideCoords[0],y:vbGuideCoords[1] + vbGuideCoords[3]}) // bottom right
    this.draw_handle({x:vbGuideCoords[0],y:vbGuideCoords[1] + vbGuideCoords[3]}) // bottom left
  }

  this.fitCroppingFrameToEdges = function (oldSize, newSize) {
    const vb = dotgrid.tool.viewBox
    // if the viewBox was the same size as the canvas before, make it so again
    if (vb[0] === 0 && vb[1] === 0 && vb[2] === oldSize.width && vb[3] === oldSize.height){
      dotgrid.tool.viewBox = [0,0,newSize.width - 15,newSize.height]
      this.update()
      return
    }
    // shrink the cropping frame to never be larger than the guide
    if (vb[0] + vb[2] > newSize.width - 15){
      dotgrid.tool.viewBox[2] = newSize.width - vb[0] - 15
    }
    if (vb[1] + vb[3] > newSize.height){
      dotgrid.tool.viewBox[3] = newSize.height - vb[1]
    }
    this.update()
  }

  function pos_is_equal(a,b){ return a && b && Math.abs(a.x) == Math.abs(b.x) && Math.abs(a.y) == Math.abs(b.y) }
  function clamp(v, min, max) { return v < min ? min : v > max ? max : v; }
}
