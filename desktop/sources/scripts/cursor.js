'use strict';

function Cursor()
{
  this.pos = {x:0,y:0};
  this.translation = null;
  this.operation = null;

  this.translate = function(from = null,to = null, multi = false, viewBoxHandle = false)
  {
    if((from || to) && this.translation == null){
      this.translation = {multi:multi};
    }

    if(from){ this.translation.from = from; }
    if(to){ this.translation.to = to; }
    if(!from && !to){
      this.translation = null;
    }
    if (viewBoxHandle) {
      this.translation = {
        from,
        to,
        viewBoxHandle
      }
    }
  }

  this.getViewBoxHandle = function (handlePos, viewBox) {
    // handlePos is {x, y} and offset by 15px
    const handleX = handlePos.x - 15
    const handleY = handlePos.y - 15
    // viewbox is [x, y, width, height]
    const vbx = viewBox[0]
    const vby = viewBox[1]
    const vbw = viewBox[2]
    const vbh = viewBox[3]
    // Figure out which corner of the viewBox is being translated
    if (handleX === vbx && handleY === vby) return 'tl'
    if (handleX === vbx + vbw && handleY === vby) return 'tr'
    if (handleX === vbx + vbw && handleY === vby + vbh) return 'br'
    if (handleX === vbx && handleY === vby + vbh) return 'bl'
  }

  this.down = function(e)
  {
    this.pos = this.pos_from_event(e);

    // viewBox comes first
    const viewBoxHandle = this.getViewBoxHandle(this.pos, dotgrid.tool.viewBox)
    if (viewBoxHandle) {
      this.translate(this.pos,this.pos,false,viewBoxHandle)
    } else {
      // Translation
      if(dotgrid.tool.vertex_at(this.pos)){
        this.translate(this.pos,this.pos,e.shiftKey)
      }
    }
    dotgrid.guide.update();
    dotgrid.interface.update();
    e.preventDefault();
  }

  this.last_pos = {x:0,y:0}

  this.move = function(e)
  {
    this.pos = this.pos_from_event(e)

    // Translation
    if(this.translation){
      this.translate(null,this.pos)
    }

    if(this.last_pos.x != this.pos.x || this.last_pos.y != this.pos.y){
      dotgrid.guide.update();
    }

    dotgrid.interface.update();
    e.preventDefault();

    this.last_pos = this.pos;
  }

  this.up = function(e)
  {
    this.pos = this.pos_from_event(e)
    if (this.translation && this.translation.viewBoxHandle) {
      // to calculate width and height correctly, we need to know the difference between
      // the old pos and the new
      const diff = {
        x: this.translation.to.x - this.translation.from.x,
        y: this.translation.to.y - this.translation.from.y,
      }
      if (this.translation.viewBoxHandle === 'tl') {
        dotgrid.tool.viewBox[0] += diff.x
        dotgrid.tool.viewBox[1] += diff.y
        dotgrid.tool.viewBox[2] -= diff.x
        dotgrid.tool.viewBox[3] -= diff.y
      }
      if (this.translation.viewBoxHandle === 'tr') {
        dotgrid.tool.viewBox[1] += diff.y
        dotgrid.tool.viewBox[2] += diff.x
        dotgrid.tool.viewBox[3] -= diff.y
      }
      if (this.translation.viewBoxHandle === 'br') {
        dotgrid.tool.viewBox[2] += diff.x
        dotgrid.tool.viewBox[3] += diff.y
      }
      if (this.translation.viewBoxHandle === 'bl') {
        dotgrid.tool.viewBox[0] += diff.x
        dotgrid.tool.viewBox[2] -= diff.x
        dotgrid.tool.viewBox[3] += diff.y
      }
    } else {
      if(e.altKey){ dotgrid.tool.remove_segments_at(this.pos); this.translate(); return; }

      if(this.translation && !is_equal(this.translation.from,this.translation.to)){
        if(this.translation.multi){ dotgrid.tool.translate_multi(this.translation.from,this.translation.to); }
        else{ dotgrid.tool.translate(this.translation.from,this.translation.to); }
      }
      else if(e.target.id == "guide"){
        dotgrid.tool.add_vertex({x:this.pos.x,y:this.pos.y});
        dotgrid.picker.stop();
      }
    }
    this.translate();

    dotgrid.interface.update();
    dotgrid.guide.update();
    e.preventDefault();
  }

  this.alt = function(e)
  {
    this.pos = this.pos_from_event(e)

    dotgrid.tool.remove_segments_at(this.pos);
    e.preventDefault();

    setTimeout(() => { dotgrid.tool.clear(); },150);
  }

  // Position Mods

  this.pos_from_event = function(e)
  {
    return this.pos_snap(this.pos_relative({x:e.clientX,y:e.clientY}))
  }

  this.pos_relative = function(pos)
  {
    return {
      x:pos.x - dotgrid.guide.el.offsetLeft,
      y:pos.y - dotgrid.guide.el.offsetTop
    };
  }

  this.pos_snap = function(pos)
  {
    let grid = dotgrid.tool.settings.size.width/dotgrid.grid_x;
    return {
      x:clamp(step(pos.x,grid),grid,dotgrid.tool.settings.size.width),
      y:clamp(step(pos.y,grid),grid,dotgrid.tool.settings.size.height+grid)
    };
  }

  function is_equal(a,b){ return a.x == b.x && a.y == b.y; }
}
