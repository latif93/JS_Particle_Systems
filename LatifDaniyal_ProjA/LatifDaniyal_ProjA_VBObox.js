//3456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_
// (JT: why the numbers? counts columns, helps me keep 80-char-wide listings)

// Tabs set to 2

/*=====================
  VBObox-Lib.js library: 
  ===================== 
Note that you don't really need 'VBObox' objects for any simple, 
    beginner-level WebGL/OpenGL programs: if all vertices contain exactly 
		the same attributes (e.g. position, color, surface normal), and use 
		the same shader program (e.g. same Vertex Shader and Fragment Shader), 
		then our textbook's simple 'example code' will suffice.
		  
***BUT*** that's rare -- most genuinely useful WebGL/OpenGL programs need 
		different sets of vertices with  different sets of attributes rendered 
		by different shader programs.  THUS a customized VBObox object for each 
		VBO/shader-program pair will help you remember and correctly implement ALL 
		the WebGL/GLSL steps required for a working multi-shader, multi-VBO program.
		
One 'VBObox' object contains all we need for WebGL/OpenGL to render on-screen a 
		set of shapes made from vertices stored in one Vertex Buffer Object (VBO), 
		as drawn by calls to one 'shader program' that runs on your computer's 
		Graphical Processing Unit(GPU), along with changes to values of that shader 
		program's one set of 'uniform' varibles.  
The 'shader program' consists of a Vertex Shader and a Fragment Shader written 
		in GLSL, compiled and linked and ready to execute as a Single-Instruction, 
		Multiple-Data (SIMD) parallel program executed simultaneously by multiple 
		'shader units' on the GPU.  The GPU runs one 'instance' of the Vertex 
		Shader for each vertex in every shape, and one 'instance' of the Fragment 
		Shader for every on-screen pixel covered by any part of any drawing 
		primitive defined by those vertices.
The 'VBO' consists of a 'buffer object' (a memory block reserved in the GPU),
		accessed by the shader program through its 'attribute' variables. Shader's
		'uniform' variable values also get retrieved from GPU memory, but their 
		values can't be changed while the shader program runs.  
		Each VBObox object stores its own 'uniform' values as vars in JavaScript; 
		its 'adjust()'	function computes newly-updated values for these uniform 
		vars and then transfers them to the GPU memory for use by shader program.
EVENTUALLY you should replace 'cuon-matrix-quat03.js' with the free, open-source
   'glmatrix.js' library for vectors, matrices & quaternions: Google it!
		This vector/matrix library is more complete, more widely-used, and runs
		faster than our textbook's 'cuon-matrix-quat03.js' library.  
		--------------------------------------------------------------
		I recommend you use glMatrix.js instead of cuon-matrix-quat03.js
		--------------------------------------------------------------
		for all future WebGL programs. 
You can CONVERT existing cuon-matrix-based programs to glmatrix.js in a very 
    gradual, sensible, testable way:
		--add the glmatrix.js library to an existing cuon-matrix-based program;
			(but don't call any of its functions yet).
		--comment out the glmatrix.js parts (if any) that cause conflicts or in	
			any way disrupt the operation of your program.
		--make just one small local change in your program; find a small, simple,
			easy-to-test portion of your program where you can replace a 
			cuon-matrix object or function call with a glmatrix function call.
			Test; make sure it works. Don't make too large a change: it's hard to fix!
		--Save a copy of this new program as your latest numbered version. Repeat
			the previous step: go on to the next small local change in your program
			and make another replacement of cuon-matrix use with glmatrix use. 
			Test it; make sure it works; save this as your next numbered version.
		--Continue this process until your program no longer uses any cuon-matrix
			library features at all, and no part of glmatrix is commented out.
			Remove cuon-matrix from your library, and now use only glmatrix.

	------------------------------------------------------------------
	VBObox -- A MESSY SET OF CUSTOMIZED OBJECTS--NOT REALLY A 'CLASS'
	------------------------------------------------------------------
As each 'VBObox' object can contain:
  -- a DIFFERENT GLSL shader program, 
  -- a DIFFERENT set of attributes that define a vertex for that shader program, 
  -- a DIFFERENT number of vertices to used to fill the VBOs in GPU memory, and 
  -- a DIFFERENT set of uniforms transferred to GPU memory for shader use.  
  THUS:
		I don't see any easy way to use the exact same object constructors and 
		prototypes for all VBObox objects.  Every additional VBObox objects may vary 
		substantially, so I recommend that you copy and re-name an existing VBObox 
		prototype object, and modify as needed, as shown here. 
		(e.g. to make the VBObox3 object, copy the VBObox2 constructor and 
		all its prototype functions, then modify their contents for VBObox3 
		activities.)

*/

// Written for EECS 351-2,	Intermediate Computer Graphics,
//							Northwestern Univ. EECS Dept., Jack Tumblin
// 2016.05.26 J. Tumblin-- Created; tested on 'TwoVBOs.html' starter code.
// 2017.02.20 J. Tumblin-- updated for EECS 351-1 use for Project C.
// 2018.04.11 J. Tumblin-- minor corrections/renaming for particle systems.
//    --11e: global 'gl' replaced redundant 'myGL' fcn args; 
//    --12: added 'SwitchToMe()' fcn to simplify 'init()' function and to fix 
//      weird subtle errors that sometimes appear when we alternate 'adjust()'
//      and 'draw()' functions of different VBObox objects. CAUSE: found that
//      only the 'draw()' function (and not the 'adjust()' function) made a full
//      changeover from one VBObox to another; thus calls to 'adjust()' for one
//      VBObox could corrupt GPU contents for another.
//      --Created vboStride, vboOffset members to centralize VBO layout in the 
//      constructor function.
//    -- 13 (abandoned) tried to make a 'core' or 'resuable' VBObox object to
//      which we would add on new properties for shaders, uniforms, etc., but
//      I decided there was too little 'common' code that wasn't customized.
//=============================================================================
var currentAngle = 0.0;  
var blinnSelected = 0.0;
var lightX = 0.0;
var lightY = 1.0; 
var lightZ = 0.0; 
var ambr = 1.0;
var ambg = 1.0; 
var ambb = 1.0; 
var diffuser = 1.0;
var diffuseg = 1.0; 
var diffuseb = 1.0; 
var specr = 1.0;
var specg = 1.0; 
var specb = 1.0; 
var lightSwitch = 1.0;
var normalMatrix = new Matrix4();

//=============================================================================
//=============================================================================
function VBObox0() {

//=============================================================================
//=============================================================================
// CONSTRUCTOR for one re-usable 'VBObox0' object that holds all data and fcns
// needed to render vertices from one Vertex Buffer Object (VBO) using one 
// separate shader program (a vertex-shader & fragment-shader pair) and one
// set of 'uniform' variables.

// Constructor goal: 
// Create and set member vars that will ELIMINATE ALL LITERALS (numerical values 
// written into code) in all other VBObox functions. Keeping all these (initial)
// values here, in this one coonstrutor function, ensures we can change them 
// easily WITHOUT disrupting any other code, ever!
  
	this.VERT_SRC =	//--------------------- VERTEX SHADER source code 
  'precision highp float;\n' +				// req'd in OpenGL ES if we use 'float'
  //
  'uniform mat4 u_ModelMat0;\n' +
  'attribute vec4 a_Pos0;\n' +
  'attribute vec3 a_Colr0;\n'+
  'varying vec3 v_Colr0;\n' +
  //
  'void main() {\n' +
  '  gl_Position = u_ModelMat0 * a_Pos0;\n' +
  '	 v_Colr0 = a_Colr0;\n' +
  ' }\n';

	this.FRAG_SRC = //---------------------- FRAGMENT SHADER source code 
  'precision mediump float;\n' +
  'varying vec3 v_Colr0;\n' +
  'void main() {\n' +
  '  gl_FragColor = vec4(v_Colr0, 1.0);\n' + 
  '}\n';
  makeGroundGrid();
  makeSphere();
  makeTorus();
  makeRectPrism();
	this.vboContents = //---------------------------------------------------------
	new Float32Array (gndVerts.length * 7 + sphVerts.length * 7 + torVerts.length * 7 + RectPrismVerts.length * 7/*+ [						// Array of vertex attribute values we will
  															// transfer to GPU's vertex buffer object (VBO)
	// 1st triangle:
  	 0.0,	 0.0,	0.0, 1.0,		1.0, 1.0, 1.0, //1 vertex:pos x,y,z,w; color: r,g,b  X AXIS
     1.0,  0.0, 0.0, 1.0,		1.0, 0.0, 0.0,
     
  	 0.0,	 0.0,	0.0, 1.0,		1.0, 1.0, 1.0, // Y AXIS
     0.0,  1.0, 0.0, 1.0,		0.0, 1.0, 0.0,
     
  	 0.0,	 0.0,	0.0, 1.0,		1.0, 1.0, 1.0, // Z AXIS
     0.0,  0.0, 1.0, 1.0,		0.0, 0.2, 1.0,
     
     // 2 long lines of the ground grid:
  	 -100.0,   0.2,	0.0, 1.0,		1.0, 0.2, 0.0, // horiz line
      100.0,   0.2, 0.0, 1.0,		0.0, 0.2, 1.0,
  	  0.2,	-100.0,	0.0, 1.0,		0.0, 1.0, 0.0, // vert line
      0.2,   100.0, 0.0, 1.0,		1.0, 0.0, 1.0,
		 ]);*/)

	this.vboVerts = 0;						// # of vertices held in 'vboContents' array
  gndStart = this.vboVerts;						// next we'll store the ground-plane;
	for(i=gndStart, j=0; j< gndVerts.length; i++, j++) {
		this.vboContents[i] = gndVerts[j];
    this.vboVerts++;	
		}
    
    sphStart = i;	
    for(i=sphStart, j=0; j< sphVerts.length; i++, j++) {
      this.vboContents[i] = sphVerts[j];
      this.vboVerts++;	
      }
      torStart = i;	
      for(i=torStart, j=0; j< torVerts.length; i++, j++) {
        this.vboContents[i] = torVerts[j];
        this.vboVerts++;	
        }
        rectStart = i;	
        for(i=rectStart, j=0; j< RectPrismVerts.length; i++, j++) {
          this.vboContents[i] = RectPrismVerts[j];
          this.vboVerts++;	
          }
	this.FSIZE = this.vboContents.BYTES_PER_ELEMENT;
	                              // bytes req'd by 1 vboContents array element;
																// (why? used to compute stride and offset 
																// in bytes for vertexAttribPointer() calls)
  this.vboBytes = this.vboContents.length * this.FSIZE;               
                                // total number of bytes stored in vboContents
                                // (#  of floats in vboContents array) * 
                                // (# of bytes/float).
                                console.log(this.vboContents.length);
                                console.log(7*this.FSIZE);
                                console.log(this.vboBytes / this.vboVerts);
                                console.log(this.vboVerts);
	this.vboStride = this.vboBytes / this.vboVerts; 
  
	                              // (== # of bytes to store one complete vertex).
	                              // From any attrib in a given vertex in the VBO, 
	                              // move forward by 'vboStride' bytes to arrive 
	                              // at the same attrib for the next vertex. 

	            //----------------------Attribute sizes
  this.vboFcount_a_Pos0 =  4;    // # of floats in the VBO needed to store the
                                // attribute named a_Pos0. (4: x,y,z,w values)
  this.vboFcount_a_Colr0 = 3;   // # of floats for this attrib (r,g,b values) 
  //console.assert((this.vboFcount_a_Pos0 +     // check the size of each and
   //               this.vboFcount_a_Colr0) *   // every attribute in our VBO
    //              this.FSIZE == this.vboStride, // for agreeement with'stride'
     //             "Uh oh! VBObox0.vboStride disagrees with attribute-size values!");

              //----------------------Attribute offsets  
	this.vboOffset_a_Pos0 = 0;    // # of bytes from START of vbo to the START
	                              // of 1st a_Pos0 attrib value in vboContents[]
  this.vboOffset_a_Colr0 = this.vboFcount_a_Pos0 * this.FSIZE;    
                                // (4 floats * bytes/float) 
                                // # of bytes from START of vbo to the START
                                // of 1st a_Colr0 attrib value in vboContents[]
	            //-----------------------GPU memory locations:
	this.vboLoc;									// GPU Location for Vertex Buffer Object, 
	                              // returned by gl.createBuffer() function call
	this.shaderLoc;								// GPU Location for compiled Shader-program  
	                            	// set by compile/link of VERT_SRC and FRAG_SRC.
								          //------Attribute locations in our shaders:
	this.a_PosLoc;								// GPU location for 'a_Pos0' attribute
	this.a_ColrLoc;								// GPU location for 'a_Colr0' attribute

	            //---------------------- Uniform locations &values in our shaders
	this.ModelMat = new Matrix4();	// Transforms CVV axes to model axes.
	this.u_ModelMatLoc;							// GPU location for u_ModelMat uniform
}
function makeGroundGrid() {
  //==============================================================================
  // Create a list of vertices that create a large grid of lines in the x,y plane
  // centered at x=y=z=0.  Draw this shape using the GL_LINES primitive.
  
    var xcount = 100;			// # of lines to draw in x,y to make the grid.
    var ycount = 100;		
    var xymax	= 50.0;			// grid size; extends to cover +/-xymax in x and y.
    var xColr = new Float32Array([1.0, 1.0, 0.3]);	// bright yellow
    var yColr = new Float32Array([0.5, 1.0, 0.5]);	// bright green.
     
    // Create an (global) array to hold this ground-plane's vertices:
    gndVerts = new Float32Array(7.00*2*(xcount+ycount));
              // draw a grid made of xcount+ycount lines; 2 vertices per line.
              
    var xgap = xymax/(xcount-1);		// HALF-spacing between lines in x,y;
    var ygap = xymax/(ycount-1);		// (why half? because v==(0line number/2))
    
    // First, step thru x values as we make vertical lines of constant-x:
    for(v=0, j=0; v<2*xcount; v++, j+= 7.00) {
      if(v%2==0) {	// put even-numbered vertices at (xnow, -xymax, 0)
        gndVerts[j  ] = -xymax + (v  )*xgap;	// x
        gndVerts[j+1] = -xymax;								// y
        gndVerts[j+2] = 0.0;									// z
        gndVerts[j+3] = 1.0;									// w.
      }
      else {				// put odd-numbered vertices at (xnow, +xymax, 0).
        gndVerts[j  ] = -xymax + (v-1)*xgap;	// x
        gndVerts[j+1] = xymax;								// y
        gndVerts[j+2] = 0.0;									// z
        gndVerts[j+3] = 1.0;									// w.
      }
      gndVerts[j+4] = xColr[0];			// red
      gndVerts[j+5] = xColr[1];			// grn
      gndVerts[j+6] = xColr[2];			// blu
    }
    // Second, step thru y values as wqe make horizontal lines of constant-y:
    // (don't re-initialize j--we're adding more vertices to the array)
    for(v=0; v<2*ycount; v++, j+= 7.00) {
      if(v%2==0) {		// put even-numbered vertices at (-xymax, ynow, 0)
        gndVerts[j  ] = -xymax;								// x
        gndVerts[j+1] = -xymax + (v  )*ygap;	// y
        gndVerts[j+2] = 0.0;									// z
        gndVerts[j+3] = 1.0;									// w.
      }
      else {					// put odd-numbered vertices at (+xymax, ynow, 0).
        gndVerts[j  ] = xymax;								// x
        gndVerts[j+1] = -xymax + (v-1)*ygap;	// y
        gndVerts[j+2] = 0.0;									// z
        gndVerts[j+3] = 1.0;									// w.
      }
      gndVerts[j+4] = yColr[0];			// red
      gndVerts[j+5] = yColr[1];			// grn
      gndVerts[j+6] = yColr[2];			// blu
    }
  }

VBObox0.prototype.init = function() {
//=============================================================================
// Prepare the GPU to use all vertices, GLSL shaders, attributes, & uniforms 
// kept in this VBObox. (This function usually called only once, within main()).
// Specifically:
// a) Create, compile, link our GLSL vertex- and fragment-shaders to form an 
//  executable 'program' stored and ready to use inside the GPU.  
// b) create a new VBO object in GPU memory and fill it by transferring in all
//  the vertex data held in our Float32array member 'VBOcontents'. 
// c) Find & save the GPU location of all our shaders' attribute-variables and 
//  uniform-variables (needed by switchToMe(), adjust(), draw(), reload(), etc.)
// -------------------
// CAREFUL!  before you can draw pictures using this VBObox contents, 
//  you must call this VBObox object's switchToMe() function too!
//--------------------
// a) Compile,link,upload shaders-----------------------------------------------
	this.shaderLoc = createProgram(gl, this.VERT_SRC, this.FRAG_SRC);
	if (!this.shaderLoc) {
    console.log(this.constructor.name + 
    						'.init() failed to create executable Shaders on the GPU. Bye!');
    return;
  }
// CUTE TRICK: let's print the NAME of this VBObox object: tells us which one!
//  else{console.log('You called: '+ this.constructor.name + '.init() fcn!');}

	gl.program = this.shaderLoc;		// (to match cuon-utils.js -- initShaders())

// b) Create VBO on GPU, fill it------------------------------------------------
	this.vboLoc = gl.createBuffer();	
  if (!this.vboLoc) {
    console.log(this.constructor.name + 
    						'.init() failed to create VBO in GPU. Bye!'); 
    return;
  }
  // Specify the purpose of our newly-created VBO on the GPU.  Your choices are:
  //	== "gl.ARRAY_BUFFER" : the VBO holds vertices, each made of attributes 
  // (positions, colors, normals, etc), or 
  //	== "gl.ELEMENT_ARRAY_BUFFER" : the VBO holds indices only; integer values 
  // that each select one vertex from a vertex array stored in another VBO.
  gl.bindBuffer(gl.ARRAY_BUFFER,	      // GLenum 'target' for this GPU buffer 
  								this.vboLoc);				  // the ID# the GPU uses for this buffer.

  // Fill the GPU's newly-created VBO object with the vertex data we stored in
  //  our 'vboContents' member (JavaScript Float32Array object).
  //  (Recall gl.bufferData() will evoke GPU's memory allocation & management: 
  //    use gl.bufferSubData() to modify VBO contents without changing VBO size)
  gl.bufferData(gl.ARRAY_BUFFER, 			  // GLenum target(same as 'bindBuffer()')
 					 				this.vboContents, 		// JavaScript Float32Array
  							 	gl.STATIC_DRAW);			// Usage hint.
  //	The 'hint' helps GPU allocate its shared memory for best speed & efficiency
  //	(see OpenGL ES specification for more info).  Your choices are:
  //		--STATIC_DRAW is for vertex buffers rendered many times, but whose 
  //				contents rarely or never change.
  //		--DYNAMIC_DRAW is for vertex buffers rendered many times, but whose 
  //				contents may change often as our program runs.
  //		--STREAM_DRAW is for vertex buffers that are rendered a small number of 
  // 			times and then discarded; for rapidly supplied & consumed VBOs.

  // c1) Find All Attributes:---------------------------------------------------
  //  Find & save the GPU location of all our shaders' attribute-variables and 
  //  uniform-variables (for switchToMe(), adjust(), draw(), reload(),etc.)
  this.a_PosLoc = gl.getAttribLocation(this.shaderLoc, 'a_Pos0');
  if(this.a_PosLoc < 0) {
    console.log(this.constructor.name + 
    						'.init() Failed to get GPU location of attribute a_Pos0');
    return -1;	// error exit.
  }
 	this.a_ColrLoc = gl.getAttribLocation(this.shaderLoc, 'a_Colr0');
  if(this.a_ColrLoc < 0) {
    console.log(this.constructor.name + 
    						'.init() failed to get the GPU location of attribute a_Colr0');
    return -1;	// error exit.
  }
  
  // c2) Find All Uniforms:-----------------------------------------------------
  //Get GPU storage location for each uniform var used in our shader programs: 
	this.u_ModelMatLoc = gl.getUniformLocation(this.shaderLoc, 'u_ModelMat0');
  if (!this.u_ModelMatLoc) { 
    console.log(this.constructor.name + 
    						'.init() failed to get GPU location for u_ModelMat1 uniform');
    return;
  }  
}



VBObox0.prototype.switchToMe = function() {
//==============================================================================
// Set GPU to use this VBObox's contents (VBO, shader, attributes, uniforms...)
//
// We only do this AFTER we called the init() function, which does the one-time-
// only setup tasks to put our VBObox contents into GPU memory.  !SURPRISE!
// even then, you are STILL not ready to draw our VBObox's contents onscreen!
// We must also first complete these steps:
//  a) tell the GPU to use our VBObox's shader program (already in GPU memory),
//  b) tell the GPU to use our VBObox's VBO  (already in GPU memory),
//  c) tell the GPU to connect the shader program's attributes to that VBO.

// a) select our shader program:
  gl.useProgram(this.shaderLoc);	
//		Each call to useProgram() selects a shader program from the GPU memory,
// but that's all -- it does nothing else!  Any previously used shader program's 
// connections to attributes and uniforms are now invalid, and thus we must now
// establish new connections between our shader program's attributes and the VBO
// we wish to use.  
  
// b) call bindBuffer to disconnect the GPU from its currently-bound VBO and
//  instead connect to our own already-created-&-filled VBO.  This new VBO can 
//    supply values to use as attributes in our newly-selected shader program:
	gl.bindBuffer(gl.ARRAY_BUFFER,	        // GLenum 'target' for this GPU buffer 
										this.vboLoc);			    // the ID# the GPU uses for our VBO.

// c) connect our newly-bound VBO to supply attribute variable values for each
// vertex to our SIMD shader program, using 'vertexAttribPointer()' function.
// this sets up data paths from VBO to our shader units:
  // 	Here's how to use the almost-identical OpenGL version of this function:
	//		http://www.opengl.org/sdk/docs/man/xhtml/glVertexAttribPointer.xml )
  gl.vertexAttribPointer(
		this.a_PosLoc,//index == ID# for the attribute var in your GLSL shader pgm;
		this.vboFcount_a_Pos0,// # of floats used by this attribute: 1,2,3 or 4?
		gl.FLOAT,			// type == what data type did we use for those numbers?
		false,				// isNormalized == are these fixed-point values that we need
									//									normalize before use? true or false
		this.vboStride,// Stride == #bytes we must skip in the VBO to move from the
		              // stored attrib for this vertex to the same stored attrib
		              //  for the next vertex in our VBO.  This is usually the 
									// number of bytes used to store one complete vertex.  If set 
									// to zero, the GPU gets attribute values sequentially from 
									// VBO, starting at 'Offset'.	
									// (Our vertex size in bytes: 4 floats for pos + 3 for color)
		this.vboOffset_a_Pos0);						
		              // Offset == how many bytes from START of buffer to the first
  								// value we will actually use?  (We start with position).
  gl.vertexAttribPointer(this.a_ColrLoc, this.vboFcount_a_Colr0, 
                        gl.FLOAT, false, 
                        this.vboStride, this.vboOffset_a_Colr0);
  							
// --Enable this assignment of each of these attributes to its' VBO source:
  gl.enableVertexAttribArray(this.a_PosLoc);
  gl.enableVertexAttribArray(this.a_ColrLoc);
}

VBObox0.prototype.isReady = function() {
//==============================================================================
// Returns 'true' if our WebGL rendering context ('gl') is ready to render using
// this objects VBO and shader program; else return false.
// see: https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter

var isOK = true;

  if(gl.getParameter(gl.CURRENT_PROGRAM) != this.shaderLoc)  {
    console.log(this.constructor.name + 
    						'.isReady() false: shader program at this.shaderLoc not in use!');
    isOK = false;
  }
  if(gl.getParameter(gl.ARRAY_BUFFER_BINDING) != this.vboLoc) {
      console.log(this.constructor.name + 
  						'.isReady() false: vbo at this.vboLoc not in use!');
    isOK = false;
  }
  return isOK;
}

VBObox0.prototype.adjust = function(g_worldMat) {
//==============================================================================
// Update the GPU to newer, current values we now store for 'uniform' vars on 
// the GPU; and (if needed) update each attribute's stride and offset in VBO.

  // check: was WebGL context set to use our VBO & shader program?
  if(this.isReady()==false) {
        console.log('ERROR! before' + this.constructor.name + 
  						'.adjust() call you needed to call this.switchToMe()!!');
  }  
	// Adjust values for our uniforms,

		this.ModelMat.setIdentity();
// THIS DOESN'T WORK!!  this.ModelMatrix = g_worldMat;
  this.ModelMat.set(g_worldMat);	// use our global, shared camera.
// READY to draw in 'world' coord axes.
//  this.ModelMat.rotate(g_angleNow0, 0, 0, 1);	  // rotate drawing axes,
//  this.ModelMat.translate(0.35, 0, 0);							// then translate them.
  //  Transfer new uniforms' values to the GPU:-------------
  // Send  new 'ModelMat' values to the GPU's 'u_ModelMat1' uniform: 
  gl.uniformMatrix4fv(this.u_ModelMatLoc,	// GPU location of the uniform
    false, 				// use matrix transpose instead?
    this.ModelMat.elements);
  
  // Adjust the attributes' stride and offset (if necessary)
  // (use gl.vertexAttribPointer() calls and gl.enableVertexAttribArray() calls)
}


VBObox0.prototype.draw = function() {
//=============================================================================
// Render current VBObox contents.

  // check: was WebGL context set to use our VBO & shader program?
  if(this.isReady()==false) {
        console.log('ERROR! before' + this.constructor.name + 
  						'.draw() call you needed to call this.switchToMe()!!');
  }  
  gl.drawArrays(gl.LINES, 	    // select the drawing primitive to draw,
    // choices: gl.POINTS, gl.LINES, gl.LINE_STRIP, gl.LINE_LOOP, 
    //          gl.TRIANGLES, gl.TRIANGLE_STRIP, ...
    0, 								// location of 1st vertex to draw;
    gndVerts.length/7);	
    pushMatrix(this.ModelMat);
    
    this.ModelMat.setTranslate(xMclik,yMclik,0);
    this.ModelMat.scale(0.05, 0.05, 0.05);
    gl.uniformMatrix4fv(this.u_ModelMatLoc,	// GPU location of the uniform
      false, 				// use matrix transpose instead?
      this.ModelMat.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP, 	    // select the drawing primitive to draw,
      // choices: gl.POINTS, gl.LINES, gl.LINE_STRIP, gl.LINE_LOOP, 
      //          gl.TRIANGLES, gl.TRIANGLE_STRIP, ...
      sphStart/7, 								// location of 1st vertex to draw;
      sphVerts.length/7);	
      this.ModelMat = popMatrix();
      this.ModelMat.translate(0.25,4.25,0.25)
      this.ModelMat.scale(0.15,0.15,0.15);
      
      gl.uniformMatrix4fv(this.u_ModelMatLoc,	// GPU location of the uniform
        false, 				// use matrix transpose instead?
        this.ModelMat.elements);
      gl.drawArrays(gl.TRIANGLE_STRIP, 	    // select the drawing primitive to draw,
        // choices: gl.POINTS, gl.LINES, gl.LINE_STRIP, gl.LINE_LOOP, 
        //          gl.TRIANGLES, gl.TRIANGLE_STRIP, ...
        sphStart/7, 								// location of 1st vertex to draw;
        sphVerts.length/7);	
        this.ModelMat.translate(3.5,-8.3,-1.70);
        this.ModelMat.scale(3,15.15,3);
        gl.uniformMatrix4fv(this.u_ModelMatLoc,	// GPU location of the uniform
          false, 				// use matrix transpose instead?
          this.ModelMat.elements);
        gl.drawArrays(gl.TRIANGLE_STRIP, 	    // select the drawing primitive to draw,
          // choices: gl.POINTS, gl.LINES, gl.LINE_STRIP, gl.LINE_LOOP, 
          //          gl.TRIANGLES, gl.TRIANGLE_STRIP, ...
          rectStart/7, 								// location of 1st vertex to draw;
          RectPrismVerts.length/7);	
      /*
      this.ModelMat.translate(8,-8,0);
      this.ModelMat.scale(5, 0.5, 0.5);

      gl.uniformMatrix4fv(this.u_ModelMatLoc,	// GPU location of the uniform
        false, 				// use matrix transpose instead?
        this.ModelMat.elements);
     gl.drawArrays(gl.TRIANGLE_STRIP, 	    // select the drawing primitive to draw,
        // choices: gl.POINTS, gl.LINES, gl.LINE_STRIP, gl.LINE_LOOP, 
        //          gl.TRIANGLES, gl.TRIANGLE_STRIP, ...
        torStart/7, 								// location of 1st vertex to draw;
        torVerts.length/7);	
*/

        
  // ----------------------------Draw the contents of the currently-bound VBO:
	// number of vertices to draw on-screen.
                  
 /* gl.drawArrays(gl.TRIANGLE_STRIP, 	    // select the drawing primitive to draw,
    // choices: gl.POINTS, gl.LINES, gl.LINE_STRIP, gl.LINE_LOOP, 
    //          gl.TRIANGLES, gl.TRIANGLE_STRIP, ...
                  gndVerts.length/7, 								// location of 1st vertex to draw;
                  sphVerts.length/7);	       */          
}

VBObox0.prototype.reload = function() {
//=============================================================================
// Over-write current values in the GPU inside our already-created VBO: use 
// gl.bufferSubData() call to re-transfer some or all of our Float32Array 
// contents to our VBO without changing any GPU memory allocations.

 gl.bufferSubData(gl.ARRAY_BUFFER, 	// GLenum target(same as 'bindBuffer()')
                  0,                  // byte offset to where data replacement
                                      // begins in the VBO.
 					 				this.vboContents);   // the JS source-data array used to fill VBO

}
/*
VBObox0.prototype.empty = function() {
//=============================================================================
// Remove/release all GPU resources used by this VBObox object, including any 
// shader programs, attributes, uniforms, textures, samplers or other claims on 
// GPU memory.  However, make sure this step is reversible by a call to 
// 'restoreMe()': be sure to retain all our Float32Array data, all values for 
// uniforms, all stride and offset values, etc.
//
//
// 		********   YOU WRITE THIS! ********
//
//
//
}

VBObox0.prototype.restore = function() {
//=============================================================================
// Replace/restore all GPU resources used by this VBObox object, including any 
// shader programs, attributes, uniforms, textures, samplers or other claims on 
// GPU memory.  Use our retained Float32Array data, all values for  uniforms, 
// all stride and offset values, etc.
//
//
// 		********   YOU WRITE THIS! ********
//
//
//
}
*/

//=============================================================================
//=============================================================================
function VBObox1() {
//=============================================================================
//=============================================================================
// CONSTRUCTOR for one re-usable 'VBObox1' object that holds all data and fcns
// needed to render vertices from one Vertex Buffer Object (VBO) using one 
// separate shader program (a vertex-shader & fragment-shader pair) and one
// set of 'uniform' variables.

// Constructor goal: 
// Create and set member vars that will ELIMINATE ALL LITERALS (numerical values 
// written into code) in all other VBObox functions. Keeping all these (initial)
// values here, in this one coonstrutor function, ensures we can change them 
// easily WITHOUT disrupting any other code, ever!
  
	this.VERT_SRC =	//--------------------- VERTEX SHADER source code 
  'uniform mat4 u_ModelMatrix;\n' +
  'attribute vec4 a_Position;\n' +
  'uniform mat4 u_NormalMatrix;\n' +
  'attribute vec3 a_Normal;\n' +
  'varying vec4 v_Color;\n' +
  'uniform vec3 lightPos;\n' +
  'uniform vec3 eyePos;\n' +
  'uniform float isBlinn;\n' +
  'uniform vec3 la;\n' +
  'uniform vec3 ld;\n' +
  'uniform vec3 ls;\n' +  
  'uniform vec3 ka;\n' +
  'uniform vec3 kd;\n' +
  'uniform vec3 ks;\n' +
  'uniform float tempShiny;\n' +
  'void main() {\n' + 
  'vec4 transVec = u_NormalMatrix * vec4(a_Normal, 0.0);\n' +
  'gl_Position = (u_ModelMatrix * a_Position);\n' +
  'vec3 normVec = normalize(transVec.xyz);\n' +		
  'vec3 lightVec = normalize(lightPos);\n' +
  'float lambertian = clamp(dot(normVec,lightVec), 0., 1.);\n' +
  'float specular = 0.0;\n' +

  'if(lambertian > 0.0) {\n' +
  'vec3 R = reflect(-lightVec, normVec);\n' +
  'vec3 V = normalize(-vec3(gl_Position));\n' +
  'float shininessVal = tempShiny;\n' +  
  'float specAngle = max(dot(R, V), 0.0);\n' +
  'if(isBlinn == 1.0) {\n' +
  'vec3 eyeDir = normalize(eyePos - vec3(gl_Position));\n' +
  'vec3 H = normalize(eyeDir + lightVec);\n' +
  'float nDotH = max(dot(H, normVec), 0.0);\n' +
  'specular = pow(nDotH, shininessVal);}\n' +
  'else {\n' +
  'specular = pow(specAngle, shininessVal);}\n' +
  ' }\n' +
  'v_Color = vec4(ka * la + kd * lambertian *ld + ks * specular * ls, 1.0);\n' +
  '}\n';

	this.FRAG_SRC = //---------------------- FRAGMENT SHADER source code 
  'precision mediump float;\n' +
//  '#ifdef GL_ES\n' +
'precision mediump float;\n' +
//  '#endif GL_ES\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_FragColor = v_Color;\n' +
  '}\n';

  
makeSphere1();
	this.vboContents = //---------------------------------------------------------
		new Float32Array (sphVerts1.length * 10);	
  
	this.vboVerts = 0;							// # of vertices held in 'vboContents' array;
  sphStart1 = 0;						// next we'll store the ground-plane;
	for(i=sphStart1, j=0; j< sphVerts1.length; i++, j++) {
		this.vboContents[i] = sphVerts1[j];
    this.vboVerts++;	
		}
  //playwith it till it works then shading and lighting tutroials
	this.FSIZE = this.vboContents.BYTES_PER_ELEMENT;  
	                              // bytes req'd by 1 vboContents array element;
																// (why? used to compute stride and offset 
																// in bytes for vertexAttribPointer() calls)
  this.vboBytes = this.vboContents.length * this.FSIZE;               
                                // (#  of floats in vboContents array) * 
                                // (# of bytes/float).
	this.vboStride = this.vboBytes / this.vboVerts;     
	                              // (== # of bytes to store one complete vertex).
	                              // From any attrib in a given vertex in the VBO, 
	                              // move forward by 'vboStride' bytes to arrive 
	                              // at the same attrib for the next vertex.
	            //----------------------Attribute sizes
  this.vboFcount_a_Pos1 =  4;    // # of floats in the VBO needed to store the
                                // attribute named a_Pos1. (4: x,y,z,w values)
  this.vboFcount_a_Colr1 = 3;   // # of floats for this attrib (r,g,b values)
 // console.assert((this.vboFcount_a_Pos1 +     // check the size of each and
 //                 this.vboFcount_a_Colr1 +
 //                 this.vboFcount_a_PtSiz1) *   // every attribute in our VBO
 //                 this.FSIZE == this.vboStride, // for agreeement with'stride'
 //                 "Uh oh! VBObox1.vboStride disagrees with attribute-size values!");
                  
              //----------------------Attribute offsets
	this.vboOffset_a_Pos1 = 0;    //# of bytes from START of vbo to the START
	                              // of 1st a_Pos1 attrib value in vboContents[]
  this.vboOffset_a_Colr1 = (this.vboFcount_a_Pos1) * this.FSIZE;  
                                // == 4 floats * bytes/float
                                //# of bytes from START of vbo to the START
                                // of 1st a_Colr1 attrib value in vboContents[]
  //this.vboOffset_a_PtSiz1 =(this.vboFcount_a_Pos1 +
    //                        this.vboFcount_a_Colr1) * this.FSIZE; 
                                // == 7 floats * bytes/float
                                // # of bytes from START of vbo to the START
                                // of 1st a_PtSize attrib value in vboContents[]

	            //-----------------------GPU memory locations:                                
	this.vboLoc;									// GPU Location for Vertex Buffer Object, 
	                              // returned by gl.createBuffer() function call
	this.shaderLoc;								// GPU Location for compiled Shader-program  
	                            	// set by compile/link of VERT_SRC and FRAG_SRC.
								          //------Attribute locations in our shaders:
	this.a_Pos1Loc;							  // GPU location: shader 'a_Pos1' attribute
  this.u_eyePos;
  this.u_lightpos;
  this.u_isBlinn;
  this.u_ka;
  this.u_kd;
  this.u_ks;
  this.u_la;
  this.u_ld;
  this.u_ls;  
  this.u_tempShiny;
	            //---------------------- Uniform locations &values in our shaders
	this.ModelMatrix = new Matrix4();	// Transforms CVV axes to model axes.
	this.u_ModelMatrixLoc;						// GPU location for u_ModelMat uniform
  this.normalMatrix = new Matrix4();
  this.u_NormalMatrix;

};


VBObox1.prototype.init = function() {
//==============================================================================
// Prepare the GPU to use all vertices, GLSL shaders, attributes, & uniforms 
// kept in this VBObox. (This function usually called only once, within main()).
// Specifically:
// a) Create, compile, link our GLSL vertex- and fragment-shaders to form an 
//  executable 'program' stored and ready to use inside the GPU.  
// b) create a new VBO object in GPU memory and fill it by transferring in all
//  the vertex data held in our Float32array member 'VBOcontents'. 
// c) Find & save the GPU location of all our shaders' attribute-variables and 
//  uniform-variables (needed by switchToMe(), adjust(), draw(), reload(), etc.)
// -------------------
// CAREFUL!  before you can draw pictures using this VBObox contents, 
//  you must call this VBObox object's switchToMe() function too!
//--------------------
// a) Compile,link,upload shaders-----------------------------------------------
	this.shaderLoc = createProgram(gl, this.VERT_SRC, this.FRAG_SRC);
	if (!this.shaderLoc) {
    console.log(this.constructor.name + 
    						'.init() failed to create executable Shaders on the GPU. Bye!');
    return;
  }
// CUTE TRICK: let's print the NAME of this VBObox object: tells us which one!
//  else{console.log('You called: '+ this.constructor.name + '.init() fcn!');}

	gl.program = this.shaderLoc;		// (to match cuon-utils.js -- initShaders())

// b) Create VBO on GPU, fill it------------------------------------------------
	this.vboLoc = gl.createBuffer();	
  if (!this.vboLoc) {
    console.log(this.constructor.name + 
    						'.init() failed to create VBO in GPU. Bye!'); 
    return;
  }
  
  // Specify the purpose of our newly-created VBO on the GPU.  Your choices are:
  //	== "gl.ARRAY_BUFFER" : the VBO holds vertices, each made of attributes 
  // (positions, colors, normals, etc), or 
  //	== "gl.ELEMENT_ARRAY_BUFFER" : the VBO holds indices only; integer values 
  // that each select one vertex from a vertex array stored in another VBO.
  gl.bindBuffer(gl.ARRAY_BUFFER,	      // GLenum 'target' for this GPU buffer 
  								this.vboLoc);				  // the ID# the GPU uses for this buffer.
  											
  // Fill the GPU's newly-created VBO object with the vertex data we stored in
  //  our 'vboContents' member (JavaScript Float32Array object).
  //  (Recall gl.bufferData() will evoke GPU's memory allocation & management: 
  //	 use gl.bufferSubData() to modify VBO contents without changing VBO size)
  gl.bufferData(gl.ARRAY_BUFFER, 			  // GLenum target(same as 'bindBuffer()')
 					 				this.vboContents, 		// JavaScript Float32Array
  							 	gl.STATIC_DRAW);			// Usage hint.  
  //	The 'hint' helps GPU allocate its shared memory for best speed & efficiency
  //	(see OpenGL ES specification for more info).  Your choices are:
  //		--STATIC_DRAW is for vertex buffers rendered many times, but whose 
  //				contents rarely or never change.
  //		--DYNAMIC_DRAW is for vertex buffers rendered many times, but whose 
  //				contents may change often as our program runs.
  //		--STREAM_DRAW is for vertex buffers that are rendered a small number of 
  // 			times and then discarded; for rapidly supplied & consumed VBOs.

// c1) Find All Attributes:-----------------------------------------------------
//  Find & save the GPU location of all our shaders' attribute-variables and 
//  uniform-variables (for switchToMe(), adjust(), draw(), reload(), etc.)
  this.a_Pos1Loc = gl.getAttribLocation(gl.program, 'a_Position');
  if(this.a_Pos1Loc < 0) {
    console.log(this.constructor.name + 
    						'.init() Failed to get GPU location of attribute a_Pos1');
    return -1;	// error exit.
  }
	this.a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
	if(this.a_Normal < 0) {
	console.log('Failed to get the storage location of a_Normal');
	return -1;
	}
  // c2) Find All Uniforms:-----------------------------------------------------
  //Get GPU storage location for each uniform var used in our shader programs: 
 this.u_ModelMatrixLoc = gl.getUniformLocation(this.shaderLoc, 'u_ModelMatrix');
  if (!this.u_ModelMatrixLoc) { 
    console.log(this.constructor.name + 
    						'.init() failed to get GPU location for u_ModelMatrix uniform');
    return;
  }

  this.u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  if(!this.u_NormalMatrix) {
	  console.log('Failed to get GPU storage location for u_NormalMatrix');
	  return
  }
  // Create our JavaScript 'normal' matrix (we send its values to GPU
  this.u_lightpos = gl.getUniformLocation(gl.program, 'lightPos');
  if (!this.u_lightpos) { 
	console.log('Failed to get the storage location');
	return;
  }
  
  this.u_la = gl.getUniformLocation(gl.program, 'la');
  if (!this.u_la) { 
	console.log('Failed to get the storage location');
	return;
  }

  this.u_ld = gl.getUniformLocation(gl.program, 'ld');
  if (!this.u_ld) { 
	console.log('Failed to get the storage location');
	return;
  }

  this.u_ls = gl.getUniformLocation(gl.program, 'ls');
  if (!this.u_ls) { 
	console.log('Failed to get the storage location');
	return;
  }

  this.u_ka = gl.getUniformLocation(gl.program, 'ka');
  if (!this.u_ka) { 
	console.log('Failed to get the storage location');
	return;
  }
  //gl.uniform3f(this.u_ka, 0.7, 0.2, 0);


  this.u_kd = gl.getUniformLocation(gl.program, 'kd');
  if (!this.u_kd) { 
	console.log('Failed to get the storage location');
	return;
  }
  //gl.uniform3f(this.u_kd, 0.3, 1, 1);

  this.u_ks = gl.getUniformLocation(gl.program, 'ks');
  if (!this.u_ks) { 
	console.log('Failed to get the storage location');
	return;
  }
  //gl.uniform3f(this.u_ks, 0.9, 0.9, 0.9);

  this.u_eyePos = gl.getUniformLocation(gl.program, 'eyePos');
  if (!this.u_eyePos) { 
	console.log('Failed to get hhh the storage location');
	return;
  }
  //gl.uniform3f(this.u_eyePos, g_EyeX, g_EyeY, g_EyeZ);

  this.u_isBlinn = gl.getUniformLocation(gl.program, 'isBlinn');
  if (!this.u_isBlinn) { 
	console.log('Failed to get the storage location');
	return;
  }  

  this.u_tempShiny = gl.getUniformLocation(gl.program, 'tempShiny');
  if (!this.u_tempShiny) { 
	console.log('Failed to get the storage location');
	return;
  }  
}

VBObox1.prototype.switchToMe = function () {
//==============================================================================
// Set GPU to use this VBObox's contents (VBO, shader, attributes, uniforms...)
//
// We only do this AFTER we called the init() function, which does the one-time-
// only setup tasks to put our VBObox contents into GPU memory.  !SURPRISE!
// even then, you are STILL not ready to draw our VBObox's contents onscreen!
// We must also first complete these steps:
//  a) tell the GPU to use our VBObox's shader program (already in GPU memory),
//  b) tell the GPU to use our VBObox's VBO  (already in GPU memory),
//  c) tell the GPU to connect the shader program's attributes to that VBO.

// a) select our shader program:
  gl.useProgram(this.shaderLoc);	
//		Each call to useProgram() selects a shader program from the GPU memory,
// but that's all -- it does nothing else!  Any previously used shader program's 
// connections to attributes and uniforms are now invalid, and thus we must now
// establish new connections between our shader program's attributes and the VBO
// we wish to use.  
  
// b) call bindBuffer to disconnect the GPU from its currently-bound VBO and
//  instead connect to our own already-created-&-filled VBO.  This new VBO can 
//    supply values to use as attributes in our newly-selected shader program:
	gl.bindBuffer(gl.ARRAY_BUFFER,	    // GLenum 'target' for this GPU buffer 
										this.vboLoc);			// the ID# the GPU uses for our VBO.

// c) connect our newly-bound VBO to supply attribute variable values for each
// vertex to our SIMD shader program, using 'vertexAttribPointer()' function.
// this sets up data paths from VBO to our shader units:
  // 	Here's how to use the almost-identical OpenGL version of this function:
	//		http://www.opengl.org/sdk/docs/man/xhtml/glVertexAttribPointer.xml )
  gl.vertexAttribPointer(
		this.a_Pos1Loc,//index == ID# for the attribute var in GLSL shader pgm;
		this.vboFcount_a_Pos1, // # of floats used by this attribute: 1,2,3 or 4?
		gl.FLOAT,		  // type == what data type did we use for those numbers?
		false,				// isNormalized == are these fixed-point values that we need
									//									normalize before use? true or false
		this.vboStride,// Stride == #bytes we must skip in the VBO to move from the
		              // stored attrib for this vertex to the same stored attrib
		              //  for the next vertex in our VBO.  This is usually the 
									// number of bytes used to store one complete vertex.  If set 
									// to zero, the GPU gets attribute values sequentially from 
									// VBO, starting at 'Offset'.	
									// (Our vertex size in bytes: 4 floats for pos + 3 for color)
		this.vboOffset_a_Pos1);						
		              // Offset == how many bytes from START of buffer to the first
  								// value we will actually use?  (we start with position).
 
                  gl.vertexAttribPointer(
  this.a_Normal, 				// choose Vertex Shader attribute to fill with data
      3, 							// how many values? 1,2,3 or 4. (we're using x,y,z)
     gl.FLOAT, 			// data type for each value: usually gl.FLOAT
  false, 					// did we supply fixed-point data AND it needs normalizing?
  this.FSIZE * 10, 		// Stride -- how many bytes used to store each vertex?
                  // (x,y,z,w, r,g,b, nx,ny,nz) * bytes/value
  this.FSIZE * 7);			// Offset -- how many bytes from START of buffer to the
                  // value we will actually use?  Need to skip over x,y,z,w,r,g,b
                  
  //-- Enable this assignment of the attribute to its' VBO source:
  gl.enableVertexAttribArray(this.a_Pos1Loc);
  gl.enableVertexAttribArray(this.a_Normal); 

}

VBObox1.prototype.isReady = function() {
//==============================================================================
// Returns 'true' if our WebGL rendering context ('gl') is ready to render using
// this objects VBO and shader program; else return false.
// see: https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter

var isOK = true;

  if(gl.getParameter(gl.CURRENT_PROGRAM) != this.shaderLoc)  {
    console.log(this.constructor.name + 
    						'.isReady() false: shader program at this.shaderLoc not in use!');
    isOK = false;
  }
  if(gl.getParameter(gl.ARRAY_BUFFER_BINDING) != this.vboLoc) {
      console.log(this.constructor.name + 
  						'.isReady() false: vbo at this.vboLoc not in use!');
    isOK = false;
  }
  return isOK;
}

VBObox1.prototype.adjust = function() {
//==============================================================================
// Update the GPU to newer, current values we now store for 'uniform' vars on 
// the GPU; and (if needed) update each attribute's stride and offset in VBO.
  // check: was WebGL context set to use our VBO & shader program?
  currentAngle = animate(currentAngle);
  gl.uniform1f(this.u_isBlinn, blinnSelected);
  gl.uniform3f(this.u_lightpos, lightX, lightY, lightZ);
  gl.uniform3f(this.u_eyePos, g_EyeX, g_EyeY, g_EyeZ);
  if(lightSwitch == 0.0){
  gl.uniform3f(this.u_la, 0, 0, 0);
  gl.uniform3f(this.u_ld, 0, 0, 0);
  gl.uniform3f(this.u_ls, 0, 0, 0);
  }
  else{
    gl.uniform3f(this.u_la, ambr, ambb, ambg);
    gl.uniform3f(this.u_ld, diffuser, diffuseg, diffuseb);
    gl.uniform3f(this.u_ls, specr, specg, specb);
  }
  if(this.isReady()==false) {
        console.log('ERROR! before' + this.constructor.name + 
  						'.adjust() call you needed to call this.switchToMe()!!');
  }
	// Adjust values for our uniforms,
	this.ModelMatrix.setIdentity();
// THIS DOESN'T WORK!!  this.ModelMatrix = g_worldMat;

  this.ModelMatrix.set(g_worldMat);


  pushMatrix(this.ModelMatrix);
  //dull copper, pearl, black rubber
  gl.uniform3f(this.u_ka, 0.25,     0.20725,  0.20725);
  gl.uniform3f(this.u_kd, 1.0,      0.829,    0.829);
  gl.uniform3f(this.u_ks, 0.296648, 0.296648, 0.296648);
  gl.uniform1f(this.u_tempShiny, 11.264);
  this.ModelMatrix.rotate(currentAngle, 0, 0, 1);
  
//  this.ModelMatrix.rotate(g_angleNow1, 0, 0, 1);	// -spin drawing axes,
  //  Transfer new uniforms' values to the GPU:-------------
  // Send  new 'ModelMat' values to the GPU's 'u_ModelMat1' uniform: 
  this.normalMatrix.setInverseOf(this.ModelMatrix);
  this.normalMatrix.transpose();

  gl.uniformMatrix4fv(this.u_ModelMatrixLoc,	// GPU location of the uniform
  										false, 										// use matrix transpose instead?
  										this.ModelMatrix.elements);	// send data from Javascript.
    gl.uniformMatrix4fv(this.u_NormalMatrix,	// GPU location of the uniform
     false, 										// use matrix transpose instead?
      this.ModelMatrix.elements);
                    }

VBObox1.prototype.draw = function() {
//=============================================================================
// Send commands to GPU to select and render current VBObox contents.

  // check: was WebGL context set to use our VBO & shader program?
  if(this.isReady()==false) {
        console.log('ERROR! before' + this.constructor.name + 
  						'.draw() call you needed to call this.switchToMe()!!');
  }
  
  // ----------------------------Draw the contents of the currently-bound VBO:
  gl.drawArrays(gl.TRIANGLE_STRIP,		    // select the drawing primitive to draw:
                  // choices: gl.POINTS, gl.LINES, gl.LINE_STRIP, gl.LINE_LOOP, 
                  //          gl.TRIANGLES, gl.TRIANGLE_STRIP,
  							0, 								// location of 1st vertex to draw;
  							sphVerts1.length/10);		// number of vertices to draw on-screen.
                this.ModelMatrix.translate(-0.7, 0.7, 0.7);
                this.ModelMatrix.rotate(2*currentAngle, 0, 0, 1);
                this.ModelMatrix.scale(0.3, 0.3, 0.3);
               this.normalMatrix.setInverseOf(this.ModelMatrix);
               this.normalMatrix.transpose();
                
               gl.uniformMatrix4fv(this.u_ModelMatrixLoc,	// GPU location of the uniform
                                   false, 										// use matrix transpose instead?
                                   this.ModelMatrix.elements);	// send data from Javascript.
                 gl.uniformMatrix4fv(this.u_NormalMatrix,	// GPU location of the uniform
                   false, 										// use matrix transpose instead?
                   this.ModelMatrix.elements);
             
                   gl.drawArrays(gl.TRIANGLE_STRIP,		    // select the drawing primitive to draw:
                     // choices: gl.POINTS, gl.LINES, gl.LINE_STRIP, gl.LINE_LOOP, 
                     //          gl.TRIANGLES, gl.TRIANGLE_STRIP,
                   0, 								// location of 1st vertex to draw;
                   sphVerts1.length/10);	
  this.ModelMatrix = popMatrix();
  pushMatrix(this.ModelMatrix);
  gl.uniform3f(this.u_ka, 0.19125,  0.0735,   0.0225);
  gl.uniform3f(this.u_kd, 0.7038,   0.27048,  0.0828);
  gl.uniform3f(this.u_ks, 0.256777, 0.137622, 0.086014);
  gl.uniform1f(this.u_tempShiny, 12.8);
  this.ModelMatrix.translate(2, 2, 0);
  this.ModelMatrix.rotate(currentAngle, 1, 1, 0);
  this.normalMatrix.setInverseOf(this.ModelMatrix);
  this.normalMatrix.transpose();
   
  gl.uniformMatrix4fv(this.u_ModelMatrixLoc,	// GPU location of the uniform
                      false, 										// use matrix transpose instead?
                      this.ModelMatrix.elements);	// send data from Javascript.
    gl.uniformMatrix4fv(this.u_NormalMatrix,	// GPU location of the uniform
      false, 										// use matrix transpose instead?
      this.ModelMatrix.elements);

      gl.drawArrays(gl.TRIANGLE_STRIP,		    // select the drawing primitive to draw:
        // choices: gl.POINTS, gl.LINES, gl.LINE_STRIP, gl.LINE_LOOP, 
        //          gl.TRIANGLES, gl.TRIANGLE_STRIP,
      0, 								// location of 1st vertex to draw;
      sphVerts1.length/10);	
      this.ModelMatrix.translate(-0.7, 0.7, 0.7);
      this.ModelMatrix.scale(0.3, 0.3, 0.3);
     this.normalMatrix.setInverseOf(this.ModelMatrix);
     this.normalMatrix.transpose();
      
     gl.uniformMatrix4fv(this.u_ModelMatrixLoc,	// GPU location of the uniform
                         false, 										// use matrix transpose instead?
                         this.ModelMatrix.elements);	// send data from Javascript.
       gl.uniformMatrix4fv(this.u_NormalMatrix,	// GPU location of the uniform
         false, 										// use matrix transpose instead?
         this.ModelMatrix.elements);
   
         gl.drawArrays(gl.TRIANGLE_STRIP,		    // select the drawing primitive to draw:
           // choices: gl.POINTS, gl.LINES, gl.LINE_STRIP, gl.LINE_LOOP, 
           //          gl.TRIANGLES, gl.TRIANGLE_STRIP,
         0, 								// location of 1st vertex to draw;
         sphVerts1.length/10);	
      this.ModelMatrix = popMatrix();
      pushMatrix(this.ModelMatrix);
      gl.uniform3f(this.u_ka, 0.02,    0.02,   0.02);
      gl.uniform3f(this.u_kd, 0.01,    0.01,   0.01);
      gl.uniform3f(this.u_ks, 0.4,     0.4,    0.4);
      gl.uniform1f(this.u_tempShiny, 10.0);
      this.ModelMatrix.translate(2, -2, 0);
      this.ModelMatrix.rotate(currentAngle, 0, 1, 0);
    
      this.normalMatrix.setInverseOf(this.ModelMatrix);
      this.normalMatrix.transpose();
       
      gl.uniformMatrix4fv(this.u_ModelMatrixLoc,	// GPU location of the uniform
                          false, 										// use matrix transpose instead?
                          this.ModelMatrix.elements);	// send data from Javascript.
        gl.uniformMatrix4fv(this.u_NormalMatrix,	// GPU location of the uniform
          false, 										// use matrix transpose instead?
          this.ModelMatrix.elements);
    
          gl.drawArrays(gl.TRIANGLE_STRIP,		    // select the drawing primitive to draw:
            // choices: gl.POINTS, gl.LINES, gl.LINE_STRIP, gl.LINE_LOOP, 
            //          gl.TRIANGLES, gl.TRIANGLE_STRIP,
          0, 								// location of 1st vertex to draw;
          sphVerts1.length/10);	
          this.ModelMatrix.translate(0.7, 0.7, 0.7);
          this.ModelMatrix.scale(0.3, 0.3, 0.3);
         this.normalMatrix.setInverseOf(this.ModelMatrix);
         this.normalMatrix.transpose();
          
         gl.uniformMatrix4fv(this.u_ModelMatrixLoc,	// GPU location of the uniform
                             false, 										// use matrix transpose instead?
                             this.ModelMatrix.elements);	// send data from Javascript.
           gl.uniformMatrix4fv(this.u_NormalMatrix,	// GPU location of the uniform
             false, 										// use matrix transpose instead?
             this.ModelMatrix.elements);
       
             gl.drawArrays(gl.TRIANGLE_STRIP,		    // select the drawing primitive to draw:
               // choices: gl.POINTS, gl.LINES, gl.LINE_STRIP, gl.LINE_LOOP, 
               //          gl.TRIANGLES, gl.TRIANGLE_STRIP,
             0, 								// location of 1st vertex to draw;
             sphVerts1.length/10);	
    
}


VBObox1.prototype.reload = function() {
//=============================================================================
// Over-write current values in the GPU for our already-created VBO: use 
// gl.bufferSubData() call to re-transfer some or all of our Float32Array 
// contents to our VBO without changing any GPU memory allocations.

 gl.bufferSubData(gl.ARRAY_BUFFER, 	// GLenum target(same as 'bindBuffer()')
                  0,                  // byte offset to where data replacement
                                      // begins in the VBO.
 					 				this.vboContents);   // the JS source-data array used to fill VBO
}

/*
VBObox1.prototype.empty = function() {
//=============================================================================
// Remove/release all GPU resources used by this VBObox object, including any 
// shader programs, attributes, uniforms, textures, samplers or other claims on 
// GPU memory.  However, make sure this step is reversible by a call to 
// 'restoreMe()': be sure to retain all our Float32Array data, all values for 
// uniforms, all stride and offset values, etc.
//
//
// 		********   YOU WRITE THIS! ********
//
//
//
}

VBObox1.prototype.restore = function() {
//=============================================================================
// Replace/restore all GPU resources used by this VBObox object, including any 
// shader programs, attributes, uniforms, textures, samplers or other claims on 
// GPU memory.  Use our retained Float32Array data, all values for  uniforms, 
// all stride and offset values, etc.
//
//
// 		********   YOU WRITE THIS! ********
//
//
//
}
*/

function VBObox2() {
  //=============================================================================
  //=============================================================================
  // CONSTRUCTOR for one re-usable 'VBObox1' object that holds all data and fcns
  // needed to render vertices from one Vertex Buffer Object (VBO) using one 
  // separate shader program (a vertex-shader & fragment-shader pair) and one
  // set of 'uniform' variables.
  
  // Constructor goal: 
  // Create and set member vars that will ELIMINATE ALL LITERALS (numerical values 
  // written into code) in all other VBObox functions. Keeping all these (initial)
  // values here, in this one coonstrutor function, ensures we can change them 
  // easily WITHOUT disrupting any other code, ever!
    
    this.VERT_SRC =	//--------------------- VERTEX SHADER source code 
    'uniform mat4 u_ModelMatrix;\n' +
    'uniform mat4 u_NormalMatrix;\n' +
    'attribute vec4 a_Position;\n' +
    'attribute vec3 a_Normal;\n' +
    'varying vec3 vertPos;\n' +
    'varying vec4 v_Color;\n' +
    'varying vec4 transVec;\n' +
    'void main() {\n' +
    'transVec = u_NormalMatrix * vec4(a_Normal, 0.0);\n' +	
    '  gl_Position = u_ModelMatrix * a_Position;\n' +
    '  vertPos = vec3(gl_Position);\n' +
    '}\n';
  
    this.FRAG_SRC = //---------------------- FRAGMENT SHADER source code 
//  '#ifdef GL_ES\n' +
'precision mediump float;\n' +
//  '#endif GL_ES\n' +
  'varying vec4 transVec;\n' +
  'uniform vec3 lightPos;\n' +
  'uniform vec3 eyePos;\n' +
  'varying vec3 vertPos;\n' +
  'uniform float isBlinn;\n' +
  'uniform vec3 la;\n' +
  'uniform vec3 ld;\n' +
  'uniform vec3 ls;\n' +  
  'uniform vec3 ka;\n' +
  'uniform vec3 kd;\n' +
  'uniform vec3 ks;\n' +  
  'void main() {\n' +
  'vec3 normVec = normalize(transVec.xyz);\n' +
  'vec3 lightVec = normalize(lightPos);\n' +	
  'float lambertian = clamp(dot(normVec,lightVec), 0., 1.);\n' +
  'float specular = 0.0;\n' +

  'if(lambertian > 0.0) {\n' +
  'vec3 R = reflect(-lightVec, normVec);\n' +
  'vec3 V = normalize(-vertPos);\n' +
  'float shininessVal = 15.0;\n' +  
  'float specAngle = max(dot(R, V), 0.0);\n' +
  'if(isBlinn == 1.0) {\n' +
  'vec3 eyeDir = normalize(eyePos - vec3(vertPos));\n' +
  'vec3 H = normalize(eyeDir + lightVec);\n' +
  'float nDotH = max(dot(H, normVec), 0.0);\n' +
  'specular = pow(nDotH, shininessVal);}\n' +
  'else {\n' +
  'specular = pow(specAngle, shininessVal);}\n' +
  ' }\n' +
  '  gl_FragColor = vec4(ka * la + kd * lambertian *ld + ks * specular * ls, 1.0);\n' +
  '}\n';
  
    
  makeSphere1();
    this.vboContents = //---------------------------------------------------------
      new Float32Array (sphVerts1.length * 10);	
    
    this.vboVerts = 0;							// # of vertices held in 'vboContents' array;
    sphStart1 = 0;						// next we'll store the ground-plane;
    for(i=sphStart1, j=0; j< sphVerts1.length; i++, j++) {
      this.vboContents[i] = sphVerts1[j];
      this.vboVerts++;	
      }
    //playwith it till it works then shading and lighting tutroials
    this.FSIZE = this.vboContents.BYTES_PER_ELEMENT;  
                                  // bytes req'd by 1 vboContents array element;
                                  // (why? used to compute stride and offset 
                                  // in bytes for vertexAttribPointer() calls)
    this.vboBytes = this.vboContents.length * this.FSIZE;               
                                  // (#  of floats in vboContents array) * 
                                  // (# of bytes/float).
    this.vboStride = this.vboBytes / this.vboVerts;     
                                  // (== # of bytes to store one complete vertex).
                                  // From any attrib in a given vertex in the VBO, 
                                  // move forward by 'vboStride' bytes to arrive 
                                  // at the same attrib for the next vertex.
                //----------------------Attribute sizes
    this.vboFcount_a_Pos1 =  4;    // # of floats in the VBO needed to store the
                                  // attribute named a_Pos1. (4: x,y,z,w values)
    this.vboFcount_a_Colr1 = 3;   // # of floats for this attrib (r,g,b values)
   // console.assert((this.vboFcount_a_Pos1 +     // check the size of each and
   //                 this.vboFcount_a_Colr1 +
   //                 this.vboFcount_a_PtSiz1) *   // every attribute in our VBO
   //                 this.FSIZE == this.vboStride, // for agreeement with'stride'
   //                 "Uh oh! VBObox1.vboStride disagrees with attribute-size values!");
                    
                //----------------------Attribute offsets
    this.vboOffset_a_Pos1 = 0;    //# of bytes from START of vbo to the START
                                  // of 1st a_Pos1 attrib value in vboContents[]
    this.vboOffset_a_Colr1 = (this.vboFcount_a_Pos1) * this.FSIZE;  
                                  // == 4 floats * bytes/float
                                  //# of bytes from START of vbo to the START
                                  // of 1st a_Colr1 attrib value in vboContents[]
    //this.vboOffset_a_PtSiz1 =(this.vboFcount_a_Pos1 +
      //                        this.vboFcount_a_Colr1) * this.FSIZE; 
                                  // == 7 floats * bytes/float
                                  // # of bytes from START of vbo to the START
                                  // of 1st a_PtSize attrib value in vboContents[]
  
                //-----------------------GPU memory locations:                                
    this.vboLoc;									// GPU Location for Vertex Buffer Object, 
                                  // returned by gl.createBuffer() function call
    this.shaderLoc;								// GPU Location for compiled Shader-program  
                                  // set by compile/link of VERT_SRC and FRAG_SRC.
                            //------Attribute locations in our shaders:
    this.a_Pos1Loc;							  // GPU location: shader 'a_Pos1' attribute
    this.u_eyePos;
    this.u_lightpos;
    this.u_isBlinn;
    this.u_ka;
    this.u_kd;
    this.u_ks;
    this.u_la;
    this.u_ld;
    this.u_ls;  
                //---------------------- Uniform locations &values in our shaders
    this.ModelMatrix = new Matrix4();	// Transforms CVV axes to model axes.
    this.u_ModelMatrixLoc;						// GPU location for u_ModelMat uniform
    this.normalMatrix = new Matrix4();
    this.u_NormalMatrix;
  
  };
  
  
  VBObox2.prototype.init = function() {
  //==============================================================================
  // Prepare the GPU to use all vertices, GLSL shaders, attributes, & uniforms 
  // kept in this VBObox. (This function usually called only once, within main()).
  // Specifically:
  // a) Create, compile, link our GLSL vertex- and fragment-shaders to form an 
  //  executable 'program' stored and ready to use inside the GPU.  
  // b) create a new VBO object in GPU memory and fill it by transferring in all
  //  the vertex data held in our Float32array member 'VBOcontents'. 
  // c) Find & save the GPU location of all our shaders' attribute-variables and 
  //  uniform-variables (needed by switchToMe(), adjust(), draw(), reload(), etc.)
  // -------------------
  // CAREFUL!  before you can draw pictures using this VBObox contents, 
  //  you must call this VBObox object's switchToMe() function too!
  //--------------------
  // a) Compile,link,upload shaders-----------------------------------------------
    this.shaderLoc = createProgram(gl, this.VERT_SRC, this.FRAG_SRC);
    if (!this.shaderLoc) {
      console.log(this.constructor.name + 
                  '.init() failed to create executable Shaders on the GPU. Bye!');
      return;
    }
  // CUTE TRICK: let's print the NAME of this VBObox object: tells us which one!
  //  else{console.log('You called: '+ this.constructor.name + '.init() fcn!');}
  
    gl.program = this.shaderLoc;		// (to match cuon-utils.js -- initShaders())
  
  // b) Create VBO on GPU, fill it------------------------------------------------
    this.vboLoc = gl.createBuffer();	
    if (!this.vboLoc) {
      console.log(this.constructor.name + 
                  '.init() failed to create VBO in GPU. Bye!'); 
      return;
    }
    
    // Specify the purpose of our newly-created VBO on the GPU.  Your choices are:
    //	== "gl.ARRAY_BUFFER" : the VBO holds vertices, each made of attributes 
    // (positions, colors, normals, etc), or 
    //	== "gl.ELEMENT_ARRAY_BUFFER" : the VBO holds indices only; integer values 
    // that each select one vertex from a vertex array stored in another VBO.
    gl.bindBuffer(gl.ARRAY_BUFFER,	      // GLenum 'target' for this GPU buffer 
                    this.vboLoc);				  // the ID# the GPU uses for this buffer.
                          
    // Fill the GPU's newly-created VBO object with the vertex data we stored in
    //  our 'vboContents' member (JavaScript Float32Array object).
    //  (Recall gl.bufferData() will evoke GPU's memory allocation & management: 
    //	 use gl.bufferSubData() to modify VBO contents without changing VBO size)
    gl.bufferData(gl.ARRAY_BUFFER, 			  // GLenum target(same as 'bindBuffer()')
                      this.vboContents, 		// JavaScript Float32Array
                     gl.STATIC_DRAW);			// Usage hint.  
    //	The 'hint' helps GPU allocate its shared memory for best speed & efficiency
    //	(see OpenGL ES specification for more info).  Your choices are:
    //		--STATIC_DRAW is for vertex buffers rendered many times, but whose 
    //				contents rarely or never change.
    //		--DYNAMIC_DRAW is for vertex buffers rendered many times, but whose 
    //				contents may change often as our program runs.
    //		--STREAM_DRAW is for vertex buffers that are rendered a small number of 
    // 			times and then discarded; for rapidly supplied & consumed VBOs.
  
  // c1) Find All Attributes:-----------------------------------------------------
  //  Find & save the GPU location of all our shaders' attribute-variables and 
  //  uniform-variables (for switchToMe(), adjust(), draw(), reload(), etc.)
    this.a_Pos1Loc = gl.getAttribLocation(gl.program, 'a_Position');
    if(this.a_Pos1Loc < 0) {
      console.log(this.constructor.name + 
                  '.init() Failed to get GPU location of attribute a_Pos1');
      return -1;	// error exit.
    }
    this.a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
    if(this.a_Normal < 0) {
    console.log('Failed to get the storage location of a_Normal');
    return -1;
    }
    // c2) Find All Uniforms:-----------------------------------------------------
    //Get GPU storage location for each uniform var used in our shader programs: 
   this.u_ModelMatrixLoc = gl.getUniformLocation(this.shaderLoc, 'u_ModelMatrix');
    if (!this.u_ModelMatrixLoc) { 
      console.log(this.constructor.name + 
                  '.init() failed to get GPU location for u_ModelMatrix uniform');
      return;
    }
  
    this.u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
    if(!this.u_NormalMatrix) {
      console.log('Failed to get GPU storage location for u_NormalMatrix');
      return
    }
    // Create our JavaScript 'normal' matrix (we send its values to GPU
    this.u_lightpos = gl.getUniformLocation(gl.program, 'lightPos');
    if (!this.u_lightpos) { 
    console.log('Failed to get the storage location');
    return;
    }
    
    this.u_la = gl.getUniformLocation(gl.program, 'la');
    if (!this.u_la) { 
    console.log('Failed to get the storage location');
    return;
    }
  
    this.u_ld = gl.getUniformLocation(gl.program, 'ld');
    if (!this.u_ld) { 
    console.log('Failed to get the storage location');
    return;
    }
  
    this.u_ls = gl.getUniformLocation(gl.program, 'ls');
    if (!this.u_ls) { 
    console.log('Failed to get the storage location');
    return;
    }
  
    this.u_ka = gl.getUniformLocation(gl.program, 'ka');
    if (!this.u_ka) { 
    console.log('Failed to get the storage location');
    return;
    }
    //gl.uniform3f(this.u_ka, 0.7, 0.2, 0);
  
  
    this.u_kd = gl.getUniformLocation(gl.program, 'kd');
    if (!this.u_kd) { 
    console.log('Failed to get the storage location');
    return;
    }
    //gl.uniform3f(this.u_kd, 0.3, 1, 1);
  
    this.u_ks = gl.getUniformLocation(gl.program, 'ks');
    if (!this.u_ks) { 
    console.log('Failed to get the storage location');
    return;
    }
    //gl.uniform3f(this.u_ks, 0.9, 0.9, 0.9);
  
    this.u_eyePos = gl.getUniformLocation(gl.program, 'eyePos');
    if (!this.u_eyePos) { 
    console.log('Failed to get hhh the storage location');
    return;
    }
    //gl.uniform3f(this.u_eyePos, g_EyeX, g_EyeY, g_EyeZ);
  
    this.u_isBlinn = gl.getUniformLocation(gl.program, 'isBlinn');
    if (!this.u_isBlinn) { 
    console.log('Failed to get the storage location');
    return;
    }  
  
  
  }
  
  VBObox2.prototype.switchToMe = function () {
  //==============================================================================
  // Set GPU to use this VBObox's contents (VBO, shader, attributes, uniforms...)
  //
  // We only do this AFTER we called the init() function, which does the one-time-
  // only setup tasks to put our VBObox contents into GPU memory.  !SURPRISE!
  // even then, you are STILL not ready to draw our VBObox's contents onscreen!
  // We must also first complete these steps:
  //  a) tell the GPU to use our VBObox's shader program (already in GPU memory),
  //  b) tell the GPU to use our VBObox's VBO  (already in GPU memory),
  //  c) tell the GPU to connect the shader program's attributes to that VBO.
  
  // a) select our shader program:
    gl.useProgram(this.shaderLoc);	
  //		Each call to useProgram() selects a shader program from the GPU memory,
  // but that's all -- it does nothing else!  Any previously used shader program's 
  // connections to attributes and uniforms are now invalid, and thus we must now
  // establish new connections between our shader program's attributes and the VBO
  // we wish to use.  
    
  // b) call bindBuffer to disconnect the GPU from its currently-bound VBO and
  //  instead connect to our own already-created-&-filled VBO.  This new VBO can 
  //    supply values to use as attributes in our newly-selected shader program:
    gl.bindBuffer(gl.ARRAY_BUFFER,	    // GLenum 'target' for this GPU buffer 
                      this.vboLoc);			// the ID# the GPU uses for our VBO.
  
  // c) connect our newly-bound VBO to supply attribute variable values for each
  // vertex to our SIMD shader program, using 'vertexAttribPointer()' function.
  // this sets up data paths from VBO to our shader units:
    // 	Here's how to use the almost-identical OpenGL version of this function:
    //		http://www.opengl.org/sdk/docs/man/xhtml/glVertexAttribPointer.xml )
    gl.vertexAttribPointer(
      this.a_Pos1Loc,//index == ID# for the attribute var in GLSL shader pgm;
      this.vboFcount_a_Pos1, // # of floats used by this attribute: 1,2,3 or 4?
      gl.FLOAT,		  // type == what data type did we use for those numbers?
      false,				// isNormalized == are these fixed-point values that we need
                    //									normalize before use? true or false
      this.vboStride,// Stride == #bytes we must skip in the VBO to move from the
                    // stored attrib for this vertex to the same stored attrib
                    //  for the next vertex in our VBO.  This is usually the 
                    // number of bytes used to store one complete vertex.  If set 
                    // to zero, the GPU gets attribute values sequentially from 
                    // VBO, starting at 'Offset'.	
                    // (Our vertex size in bytes: 4 floats for pos + 3 for color)
      this.vboOffset_a_Pos1);						
                    // Offset == how many bytes from START of buffer to the first
                    // value we will actually use?  (we start with position).
   
                    gl.vertexAttribPointer(
    this.a_Normal, 				// choose Vertex Shader attribute to fill with data
        3, 							// how many values? 1,2,3 or 4. (we're using x,y,z)
       gl.FLOAT, 			// data type for each value: usually gl.FLOAT
    false, 					// did we supply fixed-point data AND it needs normalizing?
    this.FSIZE * 10, 		// Stride -- how many bytes used to store each vertex?
                    // (x,y,z,w, r,g,b, nx,ny,nz) * bytes/value
    this.FSIZE * 7);			// Offset -- how many bytes from START of buffer to the
                    // value we will actually use?  Need to skip over x,y,z,w,r,g,b
                    
    //-- Enable this assignment of the attribute to its' VBO source:
    gl.enableVertexAttribArray(this.a_Pos1Loc);
    gl.enableVertexAttribArray(this.a_Normal); 
  
  }
  
  VBObox2.prototype.isReady = function() {
  //==============================================================================
  // Returns 'true' if our WebGL rendering context ('gl') is ready to render using
  // this objects VBO and shader program; else return false.
  // see: https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter
  
  var isOK = true;
  
    if(gl.getParameter(gl.CURRENT_PROGRAM) != this.shaderLoc)  {
      console.log(this.constructor.name + 
                  '.isReady() false: shader program at this.shaderLoc not in use!');
      isOK = false;
    }
    if(gl.getParameter(gl.ARRAY_BUFFER_BINDING) != this.vboLoc) {
        console.log(this.constructor.name + 
                '.isReady() false: vbo at this.vboLoc not in use!');
      isOK = false;
    }
    return isOK;
  }
  
  VBObox2.prototype.adjust = function() {
  //==============================================================================
  // Update the GPU to newer, current values we now store for 'uniform' vars on 
  // the GPU; and (if needed) update each attribute's stride and offset in VBO.
    // check: was WebGL context set to use our VBO & shader program?
    currentAngle = animate(currentAngle);
    gl.uniform1f(this.u_isBlinn, blinnSelected);
    gl.uniform3f(this.u_lightpos, lightX, lightY, lightZ);
    gl.uniform3f(this.u_eyePos, g_EyeX, g_EyeY, g_EyeZ);
    if(lightSwitch == 0.0){
    gl.uniform3f(this.u_la, 0, 0, 0);
    gl.uniform3f(this.u_ld, 0, 0, 0);
    gl.uniform3f(this.u_ls, 0, 0, 0);
    }
    else{
      gl.uniform3f(this.u_la, ambr, ambb, ambg);
      gl.uniform3f(this.u_ld, diffuser, diffuseg, diffuseb);
      gl.uniform3f(this.u_ls, specr, specg, specb);
    }
    if(this.isReady()==false) {
          console.log('ERROR! before' + this.constructor.name + 
                '.adjust() call you needed to call this.switchToMe()!!');
    }
    // Adjust values for our uniforms,
    this.ModelMatrix.setIdentity();
  // THIS DOESN'T WORK!!  this.ModelMatrix = g_worldMat;
  
    this.ModelMatrix.set(g_worldMat);
    pushMatrix(this.ModelMatrix);
    //dull copper, pearl, black rubber
    gl.uniform3f(this.u_ka, 0.25,     0.20725,  0.20725);
    gl.uniform3f(this.u_kd, 1.0,      0.829,    0.829);
    gl.uniform3f(this.u_ks, 0.296648, 0.296648, 0.296648);
    gl.uniform1f(this.u_tempShiny, 11.264);
    this.ModelMatrix.rotate(currentAngle, 0, 0, 1);
    
  //  this.ModelMatrix.rotate(g_angleNow1, 0, 0, 1);	// -spin drawing axes,
    //  Transfer new uniforms' values to the GPU:-------------
    // Send  new 'ModelMat' values to the GPU's 'u_ModelMat1' uniform: 
    this.normalMatrix.setInverseOf(this.ModelMatrix);
    this.normalMatrix.transpose();
  
    gl.uniformMatrix4fv(this.u_ModelMatrixLoc,	// GPU location of the uniform
                        false, 										// use matrix transpose instead?
                        this.ModelMatrix.elements);	// send data from Javascript.
      gl.uniformMatrix4fv(this.u_NormalMatrix,	// GPU location of the uniform
       false, 										// use matrix transpose instead?
        this.ModelMatrix.elements);
                      }
  
  VBObox2.prototype.draw = function() {
  //=============================================================================
  // Send commands to GPU to select and render current VBObox contents.
  
    // check: was WebGL context set to use our VBO & shader program?
    if(this.isReady()==false) {
          console.log('ERROR! before' + this.constructor.name + 
                '.draw() call you needed to call this.switchToMe()!!');
    }
    
    // ----------------------------Draw the contents of the currently-bound VBO:
    gl.drawArrays(gl.TRIANGLE_STRIP,		    // select the drawing primitive to draw:
                    // choices: gl.POINTS, gl.LINES, gl.LINE_STRIP, gl.LINE_LOOP, 
                    //          gl.TRIANGLES, gl.TRIANGLE_STRIP,
                  0, 								// location of 1st vertex to draw;
                  sphVerts1.length/10);		// number of vertices to draw on-screen.
                  this.ModelMatrix.translate(-0.7, 0.7, 0.7);
                  this.ModelMatrix.rotate(2*currentAngle, 0, 0, 1);
                  this.ModelMatrix.scale(0.3, 0.3, 0.3);
                 this.normalMatrix.setInverseOf(this.ModelMatrix);
                 this.normalMatrix.transpose();
                  
                 gl.uniformMatrix4fv(this.u_ModelMatrixLoc,	// GPU location of the uniform
                                     false, 										// use matrix transpose instead?
                                     this.ModelMatrix.elements);	// send data from Javascript.
                   gl.uniformMatrix4fv(this.u_NormalMatrix,	// GPU location of the uniform
                     false, 										// use matrix transpose instead?
                     this.ModelMatrix.elements);
               
                     gl.drawArrays(gl.TRIANGLE_STRIP,		    // select the drawing primitive to draw:
                       // choices: gl.POINTS, gl.LINES, gl.LINE_STRIP, gl.LINE_LOOP, 
                       //          gl.TRIANGLES, gl.TRIANGLE_STRIP,
                     0, 								// location of 1st vertex to draw;
                     sphVerts1.length/10);	
                  this.ModelMatrix = popMatrix();
                  pushMatrix(this.ModelMatrix);
                  gl.uniform3f(this.u_ka, 0.19125,  0.0735,   0.0225);
                  gl.uniform3f(this.u_kd, 0.7038,   0.27048,  0.0828);
                  gl.uniform3f(this.u_ks, 0.256777, 0.137622, 0.086014);
                  gl.uniform1f(this.u_tempShiny, 12.8);
                  this.ModelMatrix.translate(2, 2, 0);
                  this.ModelMatrix.rotate(currentAngle, 1, 1, 0);
                  this.normalMatrix.setInverseOf(this.ModelMatrix);
                  this.normalMatrix.transpose();
                   
                  gl.uniformMatrix4fv(this.u_ModelMatrixLoc,	// GPU location of the uniform
                                      false, 										// use matrix transpose instead?
                                      this.ModelMatrix.elements);	// send data from Javascript.
                    gl.uniformMatrix4fv(this.u_NormalMatrix,	// GPU location of the uniform
                      false, 										// use matrix transpose instead?
                      this.ModelMatrix.elements);
                
                      gl.drawArrays(gl.TRIANGLE_STRIP,		    // select the drawing primitive to draw:
                        // choices: gl.POINTS, gl.LINES, gl.LINE_STRIP, gl.LINE_LOOP, 
                        //          gl.TRIANGLES, gl.TRIANGLE_STRIP,
                      0, 								// location of 1st vertex to draw;
                      sphVerts1.length/10);	
                      this.ModelMatrix.translate(-0.7, 0.7, 0.7);
      this.ModelMatrix.scale(0.3, 0.3, 0.3);
     this.normalMatrix.setInverseOf(this.ModelMatrix);
     this.normalMatrix.transpose();
      
     gl.uniformMatrix4fv(this.u_ModelMatrixLoc,	// GPU location of the uniform
                         false, 										// use matrix transpose instead?
                         this.ModelMatrix.elements);	// send data from Javascript.
       gl.uniformMatrix4fv(this.u_NormalMatrix,	// GPU location of the uniform
         false, 										// use matrix transpose instead?
         this.ModelMatrix.elements);
   
         gl.drawArrays(gl.TRIANGLE_STRIP,		    // select the drawing primitive to draw:
           // choices: gl.POINTS, gl.LINES, gl.LINE_STRIP, gl.LINE_LOOP, 
           //          gl.TRIANGLES, gl.TRIANGLE_STRIP,
         0, 								// location of 1st vertex to draw;
         sphVerts1.length/10);	
                      this.ModelMatrix = popMatrix();
                      pushMatrix(this.ModelMatrix);
                      gl.uniform3f(this.u_ka, 0.02,    0.02,   0.02);
                      gl.uniform3f(this.u_kd, 0.01,    0.01,   0.01);
                      gl.uniform3f(this.u_ks, 0.4,     0.4,    0.4);
                      gl.uniform1f(this.u_tempShiny, 10.0);
                      this.ModelMatrix.translate(2, -2, 0);
                      this.ModelMatrix.rotate(currentAngle, 0, 1, 0);                    
                      this.normalMatrix.setInverseOf(this.ModelMatrix);
                      this.normalMatrix.transpose();
                       
                      gl.uniformMatrix4fv(this.u_ModelMatrixLoc,	// GPU location of the uniform
                                          false, 										// use matrix transpose instead?
                                          this.ModelMatrix.elements);	// send data from Javascript.
                        gl.uniformMatrix4fv(this.u_NormalMatrix,	// GPU location of the uniform
                          false, 										// use matrix transpose instead?
                          this.ModelMatrix.elements);
                    
                          gl.drawArrays(gl.TRIANGLE_STRIP,		    // select the drawing primitive to draw:
                            // choices: gl.POINTS, gl.LINES, gl.LINE_STRIP, gl.LINE_LOOP, 
                            //          gl.TRIANGLES, gl.TRIANGLE_STRIP,
                          0, 								// location of 1st vertex to draw;
                          sphVerts1.length/10);	
                          this.ModelMatrix.translate(0.7, 0.7, 0.7);
                           this.ModelMatrix.scale(0.3, 0.3, 0.3);
                          this.normalMatrix.setInverseOf(this.ModelMatrix);
                          this.normalMatrix.transpose();
                           
                          gl.uniformMatrix4fv(this.u_ModelMatrixLoc,	// GPU location of the uniform
                                              false, 										// use matrix transpose instead?
                                              this.ModelMatrix.elements);	// send data from Javascript.
                            gl.uniformMatrix4fv(this.u_NormalMatrix,	// GPU location of the uniform
                              false, 										// use matrix transpose instead?
                              this.ModelMatrix.elements);
                        
                              gl.drawArrays(gl.TRIANGLE_STRIP,		    // select the drawing primitive to draw:
                                // choices: gl.POINTS, gl.LINES, gl.LINE_STRIP, gl.LINE_LOOP, 
                                //          gl.TRIANGLES, gl.TRIANGLE_STRIP,
                              0, 								// location of 1st vertex to draw;
                              sphVerts1.length/10);	
  }
  
  
  VBObox2.prototype.reload = function() {
  //=============================================================================
  // Over-write current values in the GPU for our already-created VBO: use 
  // gl.bufferSubData() call to re-transfer some or all of our Float32Array 
  // contents to our VBO without changing any GPU memory allocations.
  
   gl.bufferSubData(gl.ARRAY_BUFFER, 	// GLenum target(same as 'bindBuffer()')
                    0,                  // byte offset to where data replacement
                                        // begins in the VBO.
                      this.vboContents);   // the JS source-data array used to fill VBO
  }
  
  function VBObox3() {

    //=============================================================================
    //=============================================================================
    // CONSTRUCTOR for one re-usable 'VBObox0' object that holds all data and fcns
    // needed to render vertices from one Vertex Buffer Object (VBO) using one 
    // separate shader program (a vertex-shader & fragment-shader pair) and one
    // set of 'uniform' variables.
    
    // Constructor goal: 
    // Create and set member vars that will ELIMINATE ALL LITERALS (numerical values 
    // written into code) in all other VBObox functions. Keeping all these (initial)
    // values here, in this one coonstrutor function, ensures we can change them 
    // easily WITHOUT disrupting any other code, ever!
      
      this.VERT_SRC =	//--------------------- VERTEX SHADER source code 
      'precision highp float;\n' +				// req'd in OpenGL ES if we use 'float'
      //
      'uniform mat4 u_ModelMat0;\n' +
      'attribute vec4 a_Pos0;\n' +
      'attribute vec3 a_Colr0;\n'+
      'varying vec3 v_Colr0;\n' +
      //
      'void main() {\n' +
      '  gl_Position = u_ModelMat0 * a_Pos0;\n' +
      '	 v_Colr0 = a_Colr0;\n' +
      ' }\n';
    
      this.FRAG_SRC = //---------------------- FRAGMENT SHADER source code 
      'precision mediump float;\n' +
      'varying vec3 v_Colr0;\n' +
      'void main() {\n' +
      '  gl_FragColor = vec4(v_Colr0, 1.0);\n' + 
      '}\n';
      makeEnclosure();
      this.vboContents = //---------------------------------------------------------
      new Float32Array (enclosureVerts.length * 7/*+ [						// Array of vertex attribute values we will
                                    // transfer to GPU's vertex buffer object (VBO)
      // 1st triangle:
         0.0,	 0.0,	0.0, 1.0,		1.0, 1.0, 1.0, //1 vertex:pos x,y,z,w; color: r,g,b  X AXIS
         1.0,  0.0, 0.0, 1.0,		1.0, 0.0, 0.0,
         
         0.0,	 0.0,	0.0, 1.0,		1.0, 1.0, 1.0, // Y AXIS
         0.0,  1.0, 0.0, 1.0,		0.0, 1.0, 0.0,
         
         0.0,	 0.0,	0.0, 1.0,		1.0, 1.0, 1.0, // Z AXIS
         0.0,  0.0, 1.0, 1.0,		0.0, 0.2, 1.0,
         
         // 2 long lines of the ground grid:
         -100.0,   0.2,	0.0, 1.0,		1.0, 0.2, 0.0, // horiz line
          100.0,   0.2, 0.0, 1.0,		0.0, 0.2, 1.0,
          0.2,	-100.0,	0.0, 1.0,		0.0, 1.0, 0.0, // vert line
          0.2,   100.0, 0.0, 1.0,		1.0, 0.0, 1.0,
         ]);*/)
    
      this.vboVerts = 0;						// # of vertices held in 'vboContents' array
      enclosureStart = this.vboVerts;						// next we'll store the ground-plane;
      for(i=enclosureStart, j=0; j< enclosureVerts.length; i++, j++) {
        this.vboContents[i] = enclosureVerts[j];
        this.vboVerts++;	
        }
    
      this.FSIZE = this.vboContents.BYTES_PER_ELEMENT;
                                    // bytes req'd by 1 vboContents array element;
                                    // (why? used to compute stride and offset 
                                    // in bytes for vertexAttribPointer() calls)
      this.vboBytes = this.vboContents.length * this.FSIZE;               
                                    // total number of bytes stored in vboContents
                                    // (#  of floats in vboContents array) * 
                                    // (# of bytes/float).
                                    console.log(this.vboContents.length);
                                    console.log(7*this.FSIZE);
                                    console.log(this.vboBytes / this.vboVerts);
                                    console.log(this.vboVerts);
      this.vboStride = this.vboBytes / this.vboVerts; 
      
                                    // (== # of bytes to store one complete vertex).
                                    // From any attrib in a given vertex in the VBO, 
                                    // move forward by 'vboStride' bytes to arrive 
                                    // at the same attrib for the next vertex. 
    
                  //----------------------Attribute sizes
      this.vboFcount_a_Pos0 =  4;    // # of floats in the VBO needed to store the
                                    // attribute named a_Pos0. (4: x,y,z,w values)
      this.vboFcount_a_Colr0 = 3;   // # of floats for this attrib (r,g,b values) 
      //console.assert((this.vboFcount_a_Pos0 +     // check the size of each and
       //               this.vboFcount_a_Colr0) *   // every attribute in our VBO
        //              this.FSIZE == this.vboStride, // for agreeement with'stride'
         //             "Uh oh! VBObox0.vboStride disagrees with attribute-size values!");
    
                  //----------------------Attribute offsets  
      this.vboOffset_a_Pos0 = 0;    // # of bytes from START of vbo to the START
                                    // of 1st a_Pos0 attrib value in vboContents[]
      this.vboOffset_a_Colr0 = this.vboFcount_a_Pos0 * this.FSIZE;    
                                    // (4 floats * bytes/float) 
                                    // # of bytes from START of vbo to the START
                                    // of 1st a_Colr0 attrib value in vboContents[]
                  //-----------------------GPU memory locations:
      this.vboLoc;									// GPU Location for Vertex Buffer Object, 
                                    // returned by gl.createBuffer() function call
      this.shaderLoc;								// GPU Location for compiled Shader-program  
                                    // set by compile/link of VERT_SRC and FRAG_SRC.
                              //------Attribute locations in our shaders:
      this.a_PosLoc;								// GPU location for 'a_Pos0' attribute
      this.a_ColrLoc;								// GPU location for 'a_Colr0' attribute
    
                  //---------------------- Uniform locations &values in our shaders
      this.ModelMat = new Matrix4();	// Transforms CVV axes to model axes.
      this.u_ModelMatLoc;							// GPU location for u_ModelMat uniform
    }
    function makeEnclosure() {
      enclosureVerts = new Float32Array([
        0.0, 0.0, 0.0, 1.0,                0.0, 0.0, 1.0,
        0.0, 2.0, 0.0, 1.0,                0.0, 0.0, 1.0,
        2.0, 2.0, 0.0, 1.0,                0.0, 0.0, 1.0,
        2.0, 0.0, 0.0, 1.0,                0.0, 0.0, 1.0,
        0.0, 0.0, 0.0, 1.0,                0.0, 0.0, 1.0,
        
        0.0, 0.0, 2.0, 1.0,                0.0, 0.0, 1.0,
        2.0, 0.0, 2.0, 1.0,                0.0, 0.0, 1.0,
        2.0, 2.0, 2.0, 1.0,                0.0, 0.0, 1.0,
        0.0, 2.0, 2.0, 1.0,                0.0, 0.0, 1.0,
        0.0, 0.0, 2.0, 1.0,                0.0, 0.0, 1.0,

        0.0, 2.0, 2.0, 1.0,                0.0, 0.0, 1.0,
        0.0, 2.0, 0.0, 1.0,                0.0, 0.0, 1.0,
        0.0, 2.0, 2.0, 1.0,                0.0, 0.0, 1.0,
        2.0, 2.0, 2.0, 1.0,                0.0, 0.0, 1.0,
        2.0, 2.0, 0.0, 1.0,                0.0, 0.0, 1.0,
        2.0, 2.0, 2.0, 1.0,                0.0, 0.0, 1.0, 
        2.0, 0.0, 2.0, 1.0,                0.0, 0.0, 1.0,
        2.0, 0.0, 0.0, 1.0,                0.0, 0.0, 1.0,  
      ])
     
    }

    VBObox3.prototype.init = function() {
    //=============================================================================
    // Prepare the GPU to use all vertices, GLSL shaders, attributes, & uniforms 
    // kept in this VBObox. (This function usually called only once, within main()).
    // Specifically:
    // a) Create, compile, link our GLSL vertex- and fragment-shaders to form an 
    //  executable 'program' stored and ready to use inside the GPU.  
    // b) create a new VBO object in GPU memory and fill it by transferring in all
    //  the vertex data held in our Float32array member 'VBOcontents'. 
    // c) Find & save the GPU location of all our shaders' attribute-variables and 
    //  uniform-variables (needed by switchToMe(), adjust(), draw(), reload(), etc.)
    // -------------------
    // CAREFUL!  before you can draw pictures using this VBObox contents, 
    //  you must call this VBObox object's switchToMe() function too!
    //--------------------
    // a) Compile,link,upload shaders-----------------------------------------------
      this.shaderLoc = createProgram(gl, this.VERT_SRC, this.FRAG_SRC);
      if (!this.shaderLoc) {
        console.log(this.constructor.name + 
                    '.init() failed to create executable Shaders on the GPU. Bye!');
        return;
      }
    // CUTE TRICK: let's print the NAME of this VBObox object: tells us which one!
    //  else{console.log('You called: '+ this.constructor.name + '.init() fcn!');}
    
      gl.program = this.shaderLoc;		// (to match cuon-utils.js -- initShaders())
    
    // b) Create VBO on GPU, fill it------------------------------------------------
      this.vboLoc = gl.createBuffer();	
      if (!this.vboLoc) {
        console.log(this.constructor.name + 
                    '.init() failed to create VBO in GPU. Bye!'); 
        return;
      }
      // Specify the purpose of our newly-created VBO on the GPU.  Your choices are:
      //	== "gl.ARRAY_BUFFER" : the VBO holds vertices, each made of attributes 
      // (positions, colors, normals, etc), or 
      //	== "gl.ELEMENT_ARRAY_BUFFER" : the VBO holds indices only; integer values 
      // that each select one vertex from a vertex array stored in another VBO.
      gl.bindBuffer(gl.ARRAY_BUFFER,	      // GLenum 'target' for this GPU buffer 
                      this.vboLoc);				  // the ID# the GPU uses for this buffer.
    
      // Fill the GPU's newly-created VBO object with the vertex data we stored in
      //  our 'vboContents' member (JavaScript Float32Array object).
      //  (Recall gl.bufferData() will evoke GPU's memory allocation & management: 
      //    use gl.bufferSubData() to modify VBO contents without changing VBO size)
      gl.bufferData(gl.ARRAY_BUFFER, 			  // GLenum target(same as 'bindBuffer()')
                        this.vboContents, 		// JavaScript Float32Array
                       gl.STATIC_DRAW);			// Usage hint.
      //	The 'hint' helps GPU allocate its shared memory for best speed & efficiency
      //	(see OpenGL ES specification for more info).  Your choices are:
      //		--STATIC_DRAW is for vertex buffers rendered many times, but whose 
      //				contents rarely or never change.
      //		--DYNAMIC_DRAW is for vertex buffers rendered many times, but whose 
      //				contents may change often as our program runs.
      //		--STREAM_DRAW is for vertex buffers that are rendered a small number of 
      // 			times and then discarded; for rapidly supplied & consumed VBOs.
    
      // c1) Find All Attributes:---------------------------------------------------
      //  Find & save the GPU location of all our shaders' attribute-variables and 
      //  uniform-variables (for switchToMe(), adjust(), draw(), reload(),etc.)
      this.a_PosLoc = gl.getAttribLocation(this.shaderLoc, 'a_Pos0');
      if(this.a_PosLoc < 0) {
        console.log(this.constructor.name + 
                    '.init() Failed to get GPU location of attribute a_Pos0');
        return -1;	// error exit.
      }
       this.a_ColrLoc = gl.getAttribLocation(this.shaderLoc, 'a_Colr0');
      if(this.a_ColrLoc < 0) {
        console.log(this.constructor.name + 
                    '.init() failed to get the GPU location of attribute a_Colr0');
        return -1;	// error exit.
      }
      
      // c2) Find All Uniforms:-----------------------------------------------------
      //Get GPU storage location for each uniform var used in our shader programs: 
      this.u_ModelMatLoc = gl.getUniformLocation(this.shaderLoc, 'u_ModelMat0');
      if (!this.u_ModelMatLoc) { 
        console.log(this.constructor.name + 
                    '.init() failed to get GPU location for u_ModelMat1 uniform');
        return;
      }  
    }
    
    
    
    VBObox3.prototype.switchToMe = function() {
    //==============================================================================
    // Set GPU to use this VBObox's contents (VBO, shader, attributes, uniforms...)
    //
    // We only do this AFTER we called the init() function, which does the one-time-
    // only setup tasks to put our VBObox contents into GPU memory.  !SURPRISE!
    // even then, you are STILL not ready to draw our VBObox's contents onscreen!
    // We must also first complete these steps:
    //  a) tell the GPU to use our VBObox's shader program (already in GPU memory),
    //  b) tell the GPU to use our VBObox's VBO  (already in GPU memory),
    //  c) tell the GPU to connect the shader program's attributes to that VBO.
    
    // a) select our shader program:
      gl.useProgram(this.shaderLoc);	
    //		Each call to useProgram() selects a shader program from the GPU memory,
    // but that's all -- it does nothing else!  Any previously used shader program's 
    // connections to attributes and uniforms are now invalid, and thus we must now
    // establish new connections between our shader program's attributes and the VBO
    // we wish to use.  
      
    // b) call bindBuffer to disconnect the GPU from its currently-bound VBO and
    //  instead connect to our own already-created-&-filled VBO.  This new VBO can 
    //    supply values to use as attributes in our newly-selected shader program:
      gl.bindBuffer(gl.ARRAY_BUFFER,	        // GLenum 'target' for this GPU buffer 
                        this.vboLoc);			    // the ID# the GPU uses for our VBO.
    
    // c) connect our newly-bound VBO to supply attribute variable values for each
    // vertex to our SIMD shader program, using 'vertexAttribPointer()' function.
    // this sets up data paths from VBO to our shader units:
      // 	Here's how to use the almost-identical OpenGL version of this function:
      //		http://www.opengl.org/sdk/docs/man/xhtml/glVertexAttribPointer.xml )
      gl.vertexAttribPointer(
        this.a_PosLoc,//index == ID# for the attribute var in your GLSL shader pgm;
        this.vboFcount_a_Pos0,// # of floats used by this attribute: 1,2,3 or 4?
        gl.FLOAT,			// type == what data type did we use for those numbers?
        false,				// isNormalized == are these fixed-point values that we need
                      //									normalize before use? true or false
        this.vboStride,// Stride == #bytes we must skip in the VBO to move from the
                      // stored attrib for this vertex to the same stored attrib
                      //  for the next vertex in our VBO.  This is usually the 
                      // number of bytes used to store one complete vertex.  If set 
                      // to zero, the GPU gets attribute values sequentially from 
                      // VBO, starting at 'Offset'.	
                      // (Our vertex size in bytes: 4 floats for pos + 3 for color)
        this.vboOffset_a_Pos0);						
                      // Offset == how many bytes from START of buffer to the first
                      // value we will actually use?  (We start with position).
      gl.vertexAttribPointer(this.a_ColrLoc, this.vboFcount_a_Colr0, 
                            gl.FLOAT, false, 
                            this.vboStride, this.vboOffset_a_Colr0);
                    
    // --Enable this assignment of each of these attributes to its' VBO source:
      gl.enableVertexAttribArray(this.a_PosLoc);
      gl.enableVertexAttribArray(this.a_ColrLoc);
    }
    
    VBObox3.prototype.isReady = function() {
    //==============================================================================
    // Returns 'true' if our WebGL rendering context ('gl') is ready to render using
    // this objects VBO and shader program; else return false.
    // see: https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter
    
    var isOK = true;
    
      if(gl.getParameter(gl.CURRENT_PROGRAM) != this.shaderLoc)  {
        console.log(this.constructor.name + 
                    '.isReady() false: shader program at this.shaderLoc not in use!');
        isOK = false;
      }
      if(gl.getParameter(gl.ARRAY_BUFFER_BINDING) != this.vboLoc) {
          console.log(this.constructor.name + 
                  '.isReady() false: vbo at this.vboLoc not in use!');
        isOK = false;
      }
      return isOK;
    }
    
    VBObox3.prototype.adjust = function(g_worldMat) {
    //==============================================================================
    // Update the GPU to newer, current values we now store for 'uniform' vars on 
    // the GPU; and (if needed) update each attribute's stride and offset in VBO.
    
      // check: was WebGL context set to use our VBO & shader program?
      if(this.isReady()==false) {
            console.log('ERROR! before' + this.constructor.name + 
                  '.adjust() call you needed to call this.switchToMe()!!');
      }  
      // Adjust values for our uniforms,
    
        this.ModelMat.setIdentity();
    // THIS DOESN'T WORK!!  this.ModelMatrix = g_worldMat;
      this.ModelMat.set(g_worldMat);	// use our global, shared camera.
    // READY to draw in 'world' coord axes.
    //  this.ModelMat.rotate(g_angleNow0, 0, 0, 1);	  // rotate drawing axes,
    //  this.ModelMat.translate(0.35, 0, 0);							// then translate them.
      //  Transfer new uniforms' values to the GPU:-------------
      // Send  new 'ModelMat' values to the GPU's 'u_ModelMat1' uniform: 
      pushMatrix(this.ModelMat);
      this.ModelMat.translate(3,-1,0);
      gl.uniformMatrix4fv(this.u_ModelMatLoc,	// GPU location of the uniform
        false, 				// use matrix transpose instead?
        this.ModelMat.elements);
      
      // Adjust the attributes' stride and offset (if necessary)
      // (use gl.vertexAttribPointer() calls and gl.enableVertexAttribArray() calls)
    }
    
    
    VBObox3.prototype.draw = function() {
    //=============================================================================
    // Render current VBObox contents.
    
      // check: was WebGL context set to use our VBO & shader program?
      if(this.isReady()==false) {
            console.log('ERROR! before' + this.constructor.name + 
                  '.draw() call you needed to call this.switchToMe()!!');
      }  
      gl.drawArrays(gl.LINE_LOOP, 0,
        
        enclosureVerts.length/7);
        this.ModelMat = popMatrix();
        pushMatrix(this.ModelMat);
        this.ModelMat.translate(-1,3,0);
        gl.uniformMatrix4fv(this.u_ModelMatLoc,	// GPU location of the uniform
          false, 				// use matrix transpose instead?
          this.ModelMat.elements);
          gl.drawArrays(gl.LINE_LOOP, 0,
        
            enclosureVerts.length/7);

            this.ModelMat = popMatrix();
            pushMatrix(this.ModelMat);
            this.ModelMat.translate(-1,-5,0);
            gl.uniformMatrix4fv(this.u_ModelMatLoc,	// GPU location of the uniform
              false, 				// use matrix transpose instead?
              this.ModelMat.elements);

                this.ModelMat = popMatrix();
                pushMatrix(this.ModelMat);
                this.ModelMat.translate(-5,-1,0);
                gl.uniformMatrix4fv(this.u_ModelMatLoc,	// GPU location of the uniform
                  false, 				// use matrix transpose instead?
                  this.ModelMat.elements);
                  gl.drawArrays(gl.LINE_LOOP, 0,
                
                    enclosureVerts.length/7);

      // ----------------------------Draw the contents of the currently-bound VBO:
      // number of vertices to draw on-screen.
                      
     /* gl.drawArrays(gl.TRIANGLE_STRIP, 	    // select the drawing primitive to draw,
        // choices: gl.POINTS, gl.LINES, gl.LINE_STRIP, gl.LINE_LOOP, 
        //          gl.TRIANGLES, gl.TRIANGLE_STRIP, ...
                      gndVerts.length/7, 								// location of 1st vertex to draw;
                      sphVerts.length/7);	       */          
    }
    
    VBObox3.prototype.reload = function() {
    //=============================================================================
    // Over-write current values in the GPU inside our already-created VBO: use 
    // gl.bufferSubData() call to re-transfer some or all of our Float32Array 
    // contents to our VBO without changing any GPU memory allocations.
    
     gl.bufferSubData(gl.ARRAY_BUFFER, 	// GLenum target(same as 'bindBuffer()')
                      0,                  // byte offset to where data replacement
                                          // begins in the VBO.
                        this.vboContents);   // the JS source-data array used to fill VBO
    
    }
  
    function VBObox4() {

      //=============================================================================
      //=============================================================================
      // CONSTRUCTOR for one re-usable 'VBObox0' object that holds all data and fcns
      // needed to render vertices from one Vertex Buffer Object (VBO) using one 
      // separate shader program (a vertex-shader & fragment-shader pair) and one
      // set of 'uniform' variables.
      
      // Constructor goal: 
      // Create and set member vars that will ELIMINATE ALL LITERALS (numerical values 
      // written into code) in all other VBObox functions. Keeping all these (initial)
      // values here, in this one coonstrutor function, ensures we can change them 
      // easily WITHOUT disrupting any other code, ever!
        
        this.VERT_SRC =	//--------------------- VERTEX SHADER source code 
        'precision highp float;\n' +				// req'd in OpenGL ES if we use 'float'
        //
        'uniform mat4 u_ModelMat0;\n' +
        'attribute vec4 a_Pos0;\n' +
        'attribute vec3 a_Colr0;\n'+
        'varying vec3 v_Colr0;\n' +
        //
        'void main() {\n' +
        '  gl_Position = u_ModelMat0 * a_Pos0;\n' +
        '	 v_Colr0 = a_Colr0;\n' +
        ' }\n';
      
        this.FRAG_SRC = //---------------------- FRAGMENT SHADER source code 
        'precision mediump float;\n' +
        'varying vec3 v_Colr0;\n' +
        'void main() {\n' +
        '  gl_FragColor = vec4(v_Colr0, 1.0);\n' + 
        '}\n';
        this.vboContents = //---------------------------------------------------------
        new Float32Array (/*+ [						// Array of vertex attribute values we will
                                      // transfer to GPU's vertex buffer object (VBO)
        // 1st triangle:
           0.0,	 0.0,	0.0, 1.0,		1.0, 1.0, 1.0, //1 vertex:pos x,y,z,w; color: r,g,b  X AXIS
           1.0,  0.0, 0.0, 1.0,		1.0, 0.0, 0.0,
           
           0.0,	 0.0,	0.0, 1.0,		1.0, 1.0, 1.0, // Y AXIS
           0.0,  1.0, 0.0, 1.0,		0.0, 1.0, 0.0,
           
           0.0,	 0.0,	0.0, 1.0,		1.0, 1.0, 1.0, // Z AXIS
           0.0,  0.0, 1.0, 1.0,		0.0, 0.2, 1.0,
           
           // 2 long lines of the ground grid:
           -100.0,   0.2,	0.0, 1.0,		1.0, 0.2, 0.0, // horiz line
            100.0,   0.2, 0.0, 1.0,		0.0, 0.2, 1.0,
            0.2,	-100.0,	0.0, 1.0,		0.0, 1.0, 0.0, // vert line
            0.2,   100.0, 0.0, 1.0,		1.0, 0.0, 1.0,
           ]);*/)
      

      
        this.FSIZE = this.vboContents.BYTES_PER_ELEMENT;
                                      // bytes req'd by 1 vboContents array element;
                                      // (why? used to compute stride and offset 
                                      // in bytes for vertexAttribPointer() calls)
        this.vboBytes = this.vboContents.length * this.FSIZE;               
                                      // total number of bytes stored in vboContents
                                      // (#  of floats in vboContents array) * 
                                      // (# of bytes/float).
                                      console.log(this.vboContents.length);
                                      console.log(7*this.FSIZE);
                                      console.log(this.vboBytes / this.vboVerts);
                                      console.log(this.vboVerts);
        this.vboStride = this.vboBytes / this.vboVerts; 
        
                                      // (== # of bytes to store one complete vertex).
                                      // From any attrib in a given vertex in the VBO, 
                                      // move forward by 'vboStride' bytes to arrive 
                                      // at the same attrib for the next vertex. 
      
                    //----------------------Attribute sizes
        this.vboFcount_a_Pos0 =  4;    // # of floats in the VBO needed to store the
                                      // attribute named a_Pos0. (4: x,y,z,w values)
        this.vboFcount_a_Colr0 = 3;   // # of floats for this attrib (r,g,b values) 
        //console.assert((this.vboFcount_a_Pos0 +     // check the size of each and
         //               this.vboFcount_a_Colr0) *   // every attribute in our VBO
          //              this.FSIZE == this.vboStride, // for agreeement with'stride'
           //             "Uh oh! VBObox0.vboStride disagrees with attribute-size values!");
      
                    //----------------------Attribute offsets  
        this.vboOffset_a_Pos0 = 0;    // # of bytes from START of vbo to the START
                                      // of 1st a_Pos0 attrib value in vboContents[]
        this.vboOffset_a_Colr0 = this.vboFcount_a_Pos0 * this.FSIZE;    
                                      // (4 floats * bytes/float) 
                                      // # of bytes from START of vbo to the START
                                      // of 1st a_Colr0 attrib value in vboContents[]
                    //-----------------------GPU memory locations:
        this.vboLoc;									// GPU Location for Vertex Buffer Object, 
                                      // returned by gl.createBuffer() function call
        this.shaderLoc;								// GPU Location for compiled Shader-program  
                                      // set by compile/link of VERT_SRC and FRAG_SRC.
                                //------Attribute locations in our shaders:
        this.a_PosLoc;								// GPU location for 'a_Pos0' attribute
        this.a_ColrLoc;								// GPU location for 'a_Colr0' attribute
      
                    //---------------------- Uniform locations &values in our shaders
        this.ModelMat = new Matrix4();	// Transforms CVV axes to model axes.
        this.u_ModelMatLoc;							// GPU location for u_ModelMat uniform
      }

  
      VBObox4.prototype.init = function() {
      //=============================================================================
      // Prepare the GPU to use all vertices, GLSL shaders, attributes, & uniforms 
      // kept in this VBObox. (This function usually called only once, within main()).
      // Specifically:
      // a) Create, compile, link our GLSL vertex- and fragment-shaders to form an 
      //  executable 'program' stored and ready to use inside the GPU.  
      // b) create a new VBO object in GPU memory and fill it by transferring in all
      //  the vertex data held in our Float32array member 'VBOcontents'. 
      // c) Find & save the GPU location of all our shaders' attribute-variables and 
      //  uniform-variables (needed by switchToMe(), adjust(), draw(), reload(), etc.)
      // -------------------
      // CAREFUL!  before you can draw pictures using this VBObox contents, 
      //  you must call this VBObox object's switchToMe() function too!
      //--------------------
      // a) Compile,link,upload shaders-----------------------------------------------
        this.shaderLoc = createProgram(gl, this.VERT_SRC, this.FRAG_SRC);
        if (!this.shaderLoc) {
          console.log(this.constructor.name + 
                      '.init() failed to create executable Shaders on the GPU. Bye!');
          return;
        }
      // CUTE TRICK: let's print the NAME of this VBObox object: tells us which one!
      //  else{console.log('You called: '+ this.constructor.name + '.init() fcn!');}
      
        gl.program = this.shaderLoc;		// (to match cuon-utils.js -- initShaders())
      
      // b) Create VBO on GPU, fill it------------------------------------------------
        this.vboLoc = gl.createBuffer();	
        if (!this.vboLoc) {
          console.log(this.constructor.name + 
                      '.init() failed to create VBO in GPU. Bye!'); 
          return;
        }
        // Specify the purpose of our newly-created VBO on the GPU.  Your choices are:
        //	== "gl.ARRAY_BUFFER" : the VBO holds vertices, each made of attributes 
        // (positions, colors, normals, etc), or 
        //	== "gl.ELEMENT_ARRAY_BUFFER" : the VBO holds indices only; integer values 
        // that each select one vertex from a vertex array stored in another VBO.
        gl.bindBuffer(gl.ARRAY_BUFFER,	      // GLenum 'target' for this GPU buffer 
                        this.vboLoc);				  // the ID# the GPU uses for this buffer.
      
        // Fill the GPU's newly-created VBO object with the vertex data we stored in
        //  our 'vboContents' member (JavaScript Float32Array object).
        //  (Recall gl.bufferData() will evoke GPU's memory allocation & management: 
        //    use gl.bufferSubData() to modify VBO contents without changing VBO size)
        gl.bufferData(gl.ARRAY_BUFFER, 			  // GLenum target(same as 'bindBuffer()')
                          this.vboContents, 		// JavaScript Float32Array
                         gl.STATIC_DRAW);			// Usage hint.
        //	The 'hint' helps GPU allocate its shared memory for best speed & efficiency
        //	(see OpenGL ES specification for more info).  Your choices are:
        //		--STATIC_DRAW is for vertex buffers rendered many times, but whose 
        //				contents rarely or never change.
        //		--DYNAMIC_DRAW is for vertex buffers rendered many times, but whose 
        //				contents may change often as our program runs.
        //		--STREAM_DRAW is for vertex buffers that are rendered a small number of 
        // 			times and then discarded; for rapidly supplied & consumed VBOs.
      
        // c1) Find All Attributes:---------------------------------------------------
        //  Find & save the GPU location of all our shaders' attribute-variables and 
        //  uniform-variables (for switchToMe(), adjust(), draw(), reload(),etc.)
        this.a_PosLoc = gl.getAttribLocation(this.shaderLoc, 'a_Pos0');
        if(this.a_PosLoc < 0) {
          console.log(this.constructor.name + 
                      '.init() Failed to get GPU location of attribute a_Pos0');
          return -1;	// error exit.
        }
         this.a_ColrLoc = gl.getAttribLocation(this.shaderLoc, 'a_Colr0');
        if(this.a_ColrLoc < 0) {
          console.log(this.constructor.name + 
                      '.init() failed to get the GPU location of attribute a_Colr0');
          return -1;	// error exit.
        }
        
        // c2) Find All Uniforms:-----------------------------------------------------
        //Get GPU storage location for each uniform var used in our shader programs: 
        this.u_ModelMatLoc = gl.getUniformLocation(this.shaderLoc, 'u_ModelMat0');
        if (!this.u_ModelMatLoc) { 
          console.log(this.constructor.name + 
                      '.init() failed to get GPU location for u_ModelMat1 uniform');
          return;
        }  
      }
      
      
      
      VBObox4.prototype.switchToMe = function() {
      //==============================================================================
      // Set GPU to use this VBObox's contents (VBO, shader, attributes, uniforms...)
      //
      // We only do this AFTER we called the init() function, which does the one-time-
      // only setup tasks to put our VBObox contents into GPU memory.  !SURPRISE!
      // even then, you are STILL not ready to draw our VBObox's contents onscreen!
      // We must also first complete these steps:
      //  a) tell the GPU to use our VBObox's shader program (already in GPU memory),
      //  b) tell the GPU to use our VBObox's VBO  (already in GPU memory),
      //  c) tell the GPU to connect the shader program's attributes to that VBO.
      
      // a) select our shader program:
        gl.useProgram(this.shaderLoc);	
      //		Each call to useProgram() selects a shader program from the GPU memory,
      // but that's all -- it does nothing else!  Any previously used shader program's 
      // connections to attributes and uniforms are now invalid, and thus we must now
      // establish new connections between our shader program's attributes and the VBO
      // we wish to use.  
        
      // b) call bindBuffer to disconnect the GPU from its currently-bound VBO and
      //  instead connect to our own already-created-&-filled VBO.  This new VBO can 
      //    supply values to use as attributes in our newly-selected shader program:
        gl.bindBuffer(gl.ARRAY_BUFFER,	        // GLenum 'target' for this GPU buffer 
                          this.vboLoc);			    // the ID# the GPU uses for our VBO.
      
      // c) connect our newly-bound VBO to supply attribute variable values for each
      // vertex to our SIMD shader program, using 'vertexAttribPointer()' function.
      // this sets up data paths from VBO to our shader units:
        // 	Here's how to use the almost-identical OpenGL version of this function:
        //		http://www.opengl.org/sdk/docs/man/xhtml/glVertexAttribPointer.xml )
        gl.vertexAttribPointer(
          this.a_PosLoc,//index == ID# for the attribute var in your GLSL shader pgm;
          this.vboFcount_a_Pos0,// # of floats used by this attribute: 1,2,3 or 4?
          gl.FLOAT,			// type == what data type did we use for those numbers?
          false,				// isNormalized == are these fixed-point values that we need
                        //									normalize before use? true or false
          this.vboStride,// Stride == #bytes we must skip in the VBO to move from the
                        // stored attrib for this vertex to the same stored attrib
                        //  for the next vertex in our VBO.  This is usually the 
                        // number of bytes used to store one complete vertex.  If set 
                        // to zero, the GPU gets attribute values sequentially from 
                        // VBO, starting at 'Offset'.	
                        // (Our vertex size in bytes: 4 floats for pos + 3 for color)
          this.vboOffset_a_Pos0);						
                        // Offset == how many bytes from START of buffer to the first
                        // value we will actually use?  (We start with position).
        gl.vertexAttribPointer(this.a_ColrLoc, this.vboFcount_a_Colr0, 
                              gl.FLOAT, false, 
                              this.vboStride, this.vboOffset_a_Colr0);
                      
      // --Enable this assignment of each of these attributes to its' VBO source:
        gl.enableVertexAttribArray(this.a_PosLoc);
        gl.enableVertexAttribArray(this.a_ColrLoc);
      }
      
      VBObox4.prototype.isReady = function() {
      //==============================================================================
      // Returns 'true' if our WebGL rendering context ('gl') is ready to render using
      // this objects VBO and shader program; else return false.
      // see: https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter
      
      var isOK = true;
      
        if(gl.getParameter(gl.CURRENT_PROGRAM) != this.shaderLoc)  {
          console.log(this.constructor.name + 
                      '.isReady() false: shader program at this.shaderLoc not in use!');
          isOK = false;
        }
        if(gl.getParameter(gl.ARRAY_BUFFER_BINDING) != this.vboLoc) {
            console.log(this.constructor.name + 
                    '.isReady() false: vbo at this.vboLoc not in use!');
          isOK = false;
        }
        return isOK;
      }
      
      VBObox4.prototype.adjust = function(g_worldMat) {
      //==============================================================================
      // Update the GPU to newer, current values we now store for 'uniform' vars on 
      // the GPU; and (if needed) update each attribute's stride and offset in VBO.
      
        // check: was WebGL context set to use our VBO & shader program?
        if(this.isReady()==false) {
              console.log('ERROR! before' + this.constructor.name + 
                    '.adjust() call you needed to call this.switchToMe()!!');
        }  
        // Adjust values for our uniforms,
      
          this.ModelMat.setIdentity();
      // THIS DOESN'T WORK!!  this.ModelMatrix = g_worldMat;
        this.ModelMat.set(g_worldMat);	// use our global, shared camera.
      // READY to draw in 'world' coord axes.
      //  this.ModelMat.rotate(g_angleNow0, 0, 0, 1);	  // rotate drawing axes,
      //  this.ModelMat.translate(0.35, 0, 0);							// then translate them.
        //  Transfer new uniforms' values to the GPU:-------------
        // Send  new 'ModelMat' values to the GPU's 'u_ModelMat1' uniform: 
        pushMatrix(this.ModelMat);
        this.ModelMat.translate(0,3,1);
        gl.uniformMatrix4fv(this.u_ModelMatLoc,	// GPU location of the uniform
          false, 				// use matrix transpose instead?
          this.ModelMat.elements);
        
        // Adjust the attributes' stride and offset (if necessary)
        // (use gl.vertexAttribPointer() calls and gl.enableVertexAttribArray() calls)
      }
      
      
      VBObox4.prototype.draw = function() {
      //=============================================================================
      // Render current VBObox contents.
      
        // check: was WebGL context set to use our VBO & shader program?
        if(this.isReady()==false) {
              console.log('ERROR! before' + this.constructor.name + 
                    '.draw() call you needed to call this.switchToMe()!!');
        }  
  
        // ----------------------------Draw the contents of the currently-bound VBO:
        // number of vertices to draw on-screen.
                        
       /* gl.drawArrays(gl.TRIANGLE_STRIP, 	    // select the drawing primitive to draw,
          // choices: gl.POINTS, gl.LINES, gl.LINE_STRIP, gl.LINE_LOOP, 
          //          gl.TRIANGLES, gl.TRIANGLE_STRIP, ...
                        gndVerts.length/7, 								// location of 1st vertex to draw;
                        sphVerts.length/7);	       */          
      }
      
      VBObox4.prototype.reload = function() {
      //=============================================================================
      // Over-write current values in the GPU inside our already-created VBO: use 
      // gl.bufferSubData() call to re-transfer some or all of our Float32Array 
      // contents to our VBO without changing any GPU memory allocations.
      
       gl.bufferSubData(gl.ARRAY_BUFFER, 	// GLenum target(same as 'bindBuffer()')
                        0,                  // byte offset to where data replacement
                                            // begins in the VBO.
                          this.vboContents);   // the JS source-data array used to fill VBO
      
      }
  /*
  VBObox1.prototype.empty = function() {
  //=============================================================================
  // Remove/release all GPU resources used by this VBObox object, including any 
  // shader programs, attributes, uniforms, textures, samplers or other claims on 
  // GPU memory.  However, make sure this step is reversible by a call to 
  // 'restoreMe()': be sure to retain all our Float32Array data, all values for 
  // uniforms, all stride and offset values, etc.
  //
  //
  // 		********   YOU WRITE THIS! ********
  //
  //
  //
  }
  
  VBObox1.prototype.restore = function() {
  //=============================================================================
  // Replace/restore all GPU resources used by this VBObox object, including any 
  // shader programs, attributes, uniforms, textures, samplers or other claims on 
  // GPU memory.  Use our retained Float32Array data, all values for  uniforms, 
  // all stride and offset values, etc.
  //
  //
  // 		********   YOU WRITE THIS! ********
  //
  //
  //
  }
  */


//=============================================================================
//=============================================================================
//=============================================================================
function makeSphere() {
  //==============================================================================
  // Make a sphere from one OpenGL TRIANGLE_STRIP primitive.   Make ring-like 
  // equal-lattitude 'slices' of the sphere (bounded by planes of constant z), 
  // and connect them as a 'stepped spiral' design (see makeCylinder) to build the
  // sphere from one triangle strip.
    var slices = 13;		// # of slices of the sphere along the z axis. >=3 req'd
                        // (choose odd # or prime# to avoid accidental symmetry)
    var sliceVerts	= 27;	// # of vertices around the top edge of the slice
                        // (same number of vertices on bottom of slice, too)
    var topColr = new Float32Array([0.7, 0.7, 0.7]);	// North Pole: light gray
    var equColr = new Float32Array([0.3, 0.7, 0.3]);	// Equator:    bright green
    var botColr = new Float32Array([0.9, 0.9, 0.9]);	// South Pole: brightest gray.
    var sliceAngle = Math.PI/slices;	// lattitude angle spanned by one slice.
  
    // Create a (global) array to hold this sphere's vertices:
    sphVerts = new Float32Array(  ((slices * 2* sliceVerts) -2) * 7.00);
                      // # of vertices * # of elements needed to store them. 
                      // each slice requires 2*sliceVerts vertices except 1st and
                      // last ones, which require only 2*sliceVerts-1.
                      
    // Create dome-shaped top slice of sphere at z=+1
    // s counts slices; v counts vertices; 
    // j counts array elements (vertices * elements per vertex)
    var cos0 = 0.0;					// sines,cosines of slice's top, bottom edge.
    var sin0 = 0.0;
    var cos1 = 0.0;
    var sin1 = 0.0;	
    var j = 0;							// initialize our array index
    var isLast = 0;
    var isFirst = 1;
    for(s=0; s<slices; s++) {	// for each slice of the sphere,
      // find sines & cosines for top and bottom of this slice
      if(s==0) {
        isFirst = 1;	// skip 1st vertex of 1st slice.
        cos0 = 1.0; 	// initialize: start at north pole.
        sin0 = 0.0;
      }
      else {					// otherwise, new top edge == old bottom edge
        isFirst = 0;	
        cos0 = cos1;
        sin0 = sin1;
      }								// & compute sine,cosine for new bottom edge.
      cos1 = Math.cos((s+1)*sliceAngle);
      sin1 = Math.sin((s+1)*sliceAngle);
      // go around the entire slice, generating TRIANGLE_STRIP verts
      // (Note we don't initialize j; grows with each new attrib,vertex, and slice)
      if(s==slices-1) isLast=1;	// skip last vertex of last slice.
      for(v=isFirst; v< 2*sliceVerts-isLast; v++, j+=7.0) {	
        if(v%2==0)
        {				// put even# vertices at the the slice's top edge
                // (why PI and not 2*PI? because 0 <= v < 2*sliceVerts
                // and thus we can simplify cos(2*PI(v/2*sliceVerts))  
          sphVerts[j  ] = sin0 * Math.cos(Math.PI*(v)/sliceVerts); 	
          sphVerts[j+1] = sin0 * Math.sin(Math.PI*(v)/sliceVerts);	
          sphVerts[j+2] = cos0;
          sphVerts[j+7] = sin0 * Math.cos(Math.PI*(v)/sliceVerts); 	
          sphVerts[j+8] = sin0 * Math.sin(Math.PI*(v)/sliceVerts);	
          sphVerts[j+9] = cos0;						
          sphVerts[j+3] = 1.0;			
        }
        else { 	// put odd# vertices around the slice's lower edge;
                // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
                // 					theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
          sphVerts[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);		// x
          sphVerts[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);		// y
          sphVerts[j+2] = cos1;		
          sphVerts[j+7] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts); 	
          sphVerts[j+8] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);	
          sphVerts[j+9] = cos1;																								// z
          sphVerts[j+3] = 1.0;																				// w.		
        }
        if(s==0) {	// finally, set some interesting colors for vertices:
          sphVerts[j+4]=topColr[0]; 
          sphVerts[j+5]=topColr[1]; 
          sphVerts[j+6]=topColr[2];	
          }
        else if(s==slices-1) {
          sphVerts[j+4]=botColr[0]; 
          sphVerts[j+5]=botColr[1]; 
          sphVerts[j+6]=botColr[2];	
        }
        else {
            sphVerts[j+4]=Math.random();// equColr[0]; 
            sphVerts[j+5]=Math.random();// equColr[1]; 
            sphVerts[j+6]=Math.random();// equColr[2];					
        }
      }
    }
  }


function makeTorus() {
//==============================================================================
// 		Create a torus centered at the origin that circles the z axis.  
// Terminology: imagine a torus as a flexible, cylinder-shaped bar or rod bent 
// into a circle around the z-axis. The bent bar's centerline forms a circle
// entirely in the z=0 plane, centered at the origin, with radius 'rbend'.  The 
// bent-bar circle begins at (rbend,0,0), increases in +y direction to circle  
// around the z-axis in counter-clockwise (CCW) direction, consistent with our
// right-handed coordinate system.
// 		This bent bar forms a torus because the bar itself has a circular cross-
// section with radius 'rbar' and angle 'phi'. We measure phi in CCW direction 
// around the bar's centerline, circling right-handed along the direction 
// forward from the bar's start at theta=0 towards its end at theta=2PI.
// 		THUS theta=0, phi=0 selects the torus surface point (rbend+rbar,0,0);
// a slight increase in phi moves that point in -z direction and a slight
// increase in theta moves that point in the +y direction.  
// To construct the torus, begin with the circle at the start of the bar:
//					xc = rbend + rbar*cos(phi); 
//					yc = 0; 
//					zc = -rbar*sin(phi);			(note negative sin(); right-handed phi)
// and then rotate this circle around the z-axis by angle theta:
//					x = xc*cos(theta) - yc*sin(theta) 	
//					y = xc*sin(theta) + yc*cos(theta)
//					z = zc
// Simplify: yc==0, so
//					x = (rbend + rbar*cos(phi))*cos(theta)
//					y = (rbend + rbar*cos(phi))*sin(theta) 
//					z = -rbar*sin(phi)
// To construct a torus from a single triangle-strip, make a 'stepped spiral' 
// along the length of the bent bar; successive rings of constant-theta, using 
// the same design used for cylinder walls in 'makeCyl()' and for 'slices' in 
// makeSphere().  Unlike the cylinder and sphere, we have no 'special case' 
// for the first and last of these bar-encircling rings.
//
var rbend = 1.0;										// Radius of circle formed by torus' bent bar
var rbar = 0.5;											// radius of the bar we bent to form torus
var barSlices = 23;									// # of bar-segments in the torus: >=3 req'd;
																		// more segments for more-circular torus
var barSides = 13;										// # of sides of the bar (and thus the 
																		// number of vertices in its cross-section)
																		// >=3 req'd;
																		// more sides for more-circular cross-section
// for nice-looking torus with approx square facets, 
//			--choose odd or prime#  for barSides, and
//			--choose pdd or prime# for barSlices of approx. barSides *(rbend/rbar)
// EXAMPLE: rbend = 1, rbar = 0.5, barSlices =23, barSides = 11.

	// Create a (global) array to hold this torus's vertices:
 torVerts = new Float32Array(7.0*(2*barSides*barSlices +2));
//	Each slice requires 2*barSides vertices, but 1st slice will skip its first 
// triangle and last slice will skip its last triangle. To 'close' the torus,
// repeat the first 2 vertices at the end of the triangle-strip.  Assume 7

var phi=0, theta=0;										// begin torus at angles 0,0
var thetaStep = 2*Math.PI/barSlices;	// theta angle between each bar segment
var phiHalfStep = Math.PI/barSides;		// half-phi angle between each side of bar
																			// (WHY HALF? 2 vertices per step in phi)
	// s counts slices of the bar; v counts vertices within one slice; j counts
	// array elements (Float32) (vertices*#attribs/vertex) put in torVerts array.
	for(s=0,j=0; s<barSlices; s++) {		// for each 'slice' or 'ring' of the torus:
		for(v=0; v< 2*barSides; v++, j+=7) {		// for each vertex in this slice:
			if(v%2==0)	{	// even #'d vertices at bottom of slice,
				torVerts[j  ] = (rbend + rbar*Math.cos((v)*phiHalfStep)) * 
																						 Math.cos((s)*thetaStep);
							  //	x = (rbend + rbar*cos(phi)) * cos(theta)
				torVerts[j+1] = (rbend + rbar*Math.cos((v)*phiHalfStep)) *
																						 Math.sin((s)*thetaStep);
								//  y = (rbend + rbar*cos(phi)) * sin(theta) 
				torVerts[j+2] = -rbar*Math.sin((v)*phiHalfStep);
								//  z = -rbar  *   sin(phi)
				torVerts[j+3] = 1.0;		// w
			}
			else {				// odd #'d vertices at top of slice (s+1);
										// at same phi used at bottom of slice (v-1)
				torVerts[j  ] = (rbend + rbar*Math.cos((v-1)*phiHalfStep)) * 
																						 Math.cos((s+1)*thetaStep);
							  //	x = (rbend + rbar*cos(phi)) * cos(theta)
				torVerts[j+1] = (rbend + rbar*Math.cos((v-1)*phiHalfStep)) *
																						 Math.sin((s+1)*thetaStep);
								//  y = (rbend + rbar*cos(phi)) * sin(theta) 
				torVerts[j+2] = -rbar*Math.sin((v-1)*phiHalfStep);
								//  z = -rbar  *   sin(phi)
				torVerts[j+3] = 1.0;		// w
			}
			torVerts[j+4] = Math.random();		// random color 0.0 <= R < 1.0
			torVerts[j+5] = Math.random();		// random color 0.0 <= G < 1.0
			torVerts[j+6] = Math.random();		// random color 0.0 <= B < 1.0
		}
	}
	// Repeat the 1st 2 vertices of the triangle strip to complete the torus:
			torVerts[j  ] = rbend + rbar;	// copy vertex zero;
						  //	x = (rbend + rbar*cos(phi==0)) * cos(theta==0)
			torVerts[j+1] = 0.0;
							//  y = (rbend + rbar*cos(phi==0)) * sin(theta==0) 
			torVerts[j+2] = 0.0;
							//  z = -rbar  *   sin(phi==0)
			torVerts[j+3] = 1.0;		// w
			torVerts[j+4] = Math.random();		// random color 0.0 <= R < 1.0
			torVerts[j+5] = Math.random();		// random color 0.0 <= G < 1.0
			torVerts[j+6] = Math.random();		// random color 0.0 <= B < 1.0
			j+=7; // go to next vertex:
			torVerts[j  ] = (rbend + rbar) * Math.cos(thetaStep);
						  //	x = (rbend + rbar*cos(phi==0)) * cos(theta==thetaStep)
			torVerts[j+1] = (rbend + rbar) * Math.sin(thetaStep);
							//  y = (rbend + rbar*cos(phi==0)) * sin(theta==thetaStep) 
			torVerts[j+2] = 0.0;
							//  z = -rbar  *   sin(phi==0)
			torVerts[j+3] = 1.0;		// w
			torVerts[j+4] = Math.random();		// random color 0.0 <= R < 1.0
			torVerts[j+5] = Math.random();		// random color 0.0 <= G < 1.0
			torVerts[j+6] = Math.random();		// random color 0.0 <= B < 1.0
}


  function makeSphere1() {
    //==============================================================================
    // Make a sphere from one OpenGL TRIANGLE_STRIP primitive.   Make ring-like 
    // equal-lattitude 'slices' of the sphere (bounded by planes of constant z), 
    // and connect them as a 'stepped spiral' design (see makeCylinder) to build the
    // sphere from one triangle strip.
      var slices = 13;		// # of slices of the sphere along the z axis. >=3 req'd
                          // (choose odd # or prime# to avoid accidental symmetry)
      var sliceVerts	= 27;	// # of vertices around the top edge of the slice
                          // (same number of vertices on bottom of slice, too)
      var topColr = new Float32Array([0.7, 0.7, 0.7]);	// North Pole: light gray
      var equColr = new Float32Array([0.3, 0.7, 0.3]);	// Equator:    bright green
      var botColr = new Float32Array([0.9, 0.9, 0.9]);	// South Pole: brightest gray.
      var sliceAngle = Math.PI/slices;	// lattitude angle spanned by one slice.
    
      // Create a (global) array to hold this sphere's vertices:
      sphVerts1 = new Float32Array(  ((slices * 2* sliceVerts) -2) * 10.00);
                        // # of vertices * # of elements needed to store them. 
                        // each slice requires 2*sliceVerts vertices except 1st and
                        // last ones, which require only 2*sliceVerts-1.
                        
      // Create dome-shaped top slice of sphere at z=+1
      // s counts slices; v counts vertices; 
      // j counts array elements (vertices * elements per vertex)
      var cos0 = 0.0;					// sines,cosines of slice's top, bottom edge.
      var sin0 = 0.0;
      var cos1 = 0.0;
      var sin1 = 0.0;	
      var j = 0;							// initialize our array index
      var isLast = 0;
      var isFirst = 1;
      for(s=0; s<slices; s++) {	// for each slice of the sphere,
        // find sines & cosines for top and bottom of this slice
        if(s==0) {
          isFirst = 1;	// skip 1st vertex of 1st slice.
          cos0 = 1.0; 	// initialize: start at north pole.
          sin0 = 0.0;
        }
        else {					// otherwise, new top edge == old bottom edge
          isFirst = 0;	
          cos0 = cos1;
          sin0 = sin1;
        }								// & compute sine,cosine for new bottom edge.
        cos1 = Math.cos((s+1)*sliceAngle);
        sin1 = Math.sin((s+1)*sliceAngle);
        // go around the entire slice, generating TRIANGLE_STRIP verts
        // (Note we don't initialize j; grows with each new attrib,vertex, and slice)
        if(s==slices-1) isLast=1;	// skip last vertex of last slice.
        for(v=isFirst; v< 2*sliceVerts-isLast; v++, j+=10.0) {	
          if(v%2==0)
          {				// put even# vertices at the the slice's top edge
                  // (why PI and not 2*PI? because 0 <= v < 2*sliceVerts
                  // and thus we can simplify cos(2*PI(v/2*sliceVerts))  
            sphVerts1[j  ] = sin0 * Math.cos(Math.PI*(v)/sliceVerts); 	
            sphVerts1[j+1] = sin0 * Math.sin(Math.PI*(v)/sliceVerts);	
            sphVerts1[j+2] = cos0;
            sphVerts1[j+7] = sin0 * Math.cos(Math.PI*(v)/sliceVerts); 	
            sphVerts1[j+8] = sin0 * Math.sin(Math.PI*(v)/sliceVerts);	
            sphVerts1[j+9] = cos0;						
            sphVerts1[j+3] = 1.0;			
          }
          else { 	// put odd# vertices around the slice's lower edge;
                  // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
                  // 					theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
            sphVerts1[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);		// x
            sphVerts1[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);		// y
            sphVerts1[j+2] = cos1;		
            sphVerts1[j+7] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts); 	
            sphVerts1[j+8] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);	
            sphVerts1[j+9] = cos1;																								// z
            sphVerts1[j+3] = 1.0;																				// w.		
          }
          if(s==0) {	// finally, set some interesting colors for vertices:
            sphVerts1[j+4]=topColr[0]; 
            sphVerts1[j+5]=topColr[1]; 
            sphVerts1[j+6]=topColr[2];	
            }
          else if(s==slices-1) {
            sphVerts1[j+4]=botColr[0]; 
            sphVerts1[j+5]=botColr[1]; 
            sphVerts1[j+6]=botColr[2];	
          }
          else {
              sphVerts1[j+4]=Math.random();// equColr[0]; 
              sphVerts1[j+5]=Math.random();// equColr[1]; 
              sphVerts1[j+6]=Math.random();// equColr[2];					
          }
        }
      }
    }


var g_last = Date.now();

function animate(angle) {
//==============================================================================
  // Calculate the elapsed time
  var now = Date.now();
  var elapsed = now - g_last;
  g_last = now;    
  // Update the current rotation angle (adjusted by the elapsed time)
  //  limit the angle to move smoothly between +20 and -85 degrees:
//  if(angle >  120.0 && ANGLE_STEP > 0) ANGLE_STEP = -ANGLE_STEP;
//  if(angle < -120.0 && ANGLE_STEP < 0) ANGLE_STEP = -ANGLE_STEP;
  
  var newAngle = angle + (45.0 * elapsed) / 1000.0;
  return newAngle %= 360;
}

function turnOnBlinnPhong() {
  blinnSelected = 1.0;

      console.log("should be blinn now");   
 }
function turnOnPhong() {
  blinnSelected = 0.0;

console.log("should be phong now");   
} 

function LightOnOff(){
if(lightSwitch == 1.0){
  lightSwitch = 0.0;
  console.log("light off");
  }
  else{
    lightSwitch = 1.0;
    console.log("light on");
  }
}

function makeRectPrism(){
	RectPrismVerts = new Float32Array([
		0.0, 0.0, 0.0, 1.0,			1.0, 0.0, 0.0,		// r
		0.5, 0.0, 0.0, 1.0,     	1.0, 1.0, 0.0,	  // ylw
		0.0, 0.5, 0.0, 1.0,			0.0, 0.0, 0.0,		// blk
	   
		0.5, 0.5, 0.0, 1.0,  1.0, 0.0, 0.0,		// r  					
		0.5, 0.0, 0.0, 1.0,  1.0, 1.0, 0.0,	  // ylw 	
		0.0, 0.5, 0.0, 1.0,  0.0, 0.0, 0.0,		// blk
		//bot-mid rn X
		0.0, 0.0, 0.5, 1.0,			1.0, 0.0, 0.0,		// r
		0.5, 0.0, 0.5, 1.0,     	0.0, 0.0, 0.0,		// blk
		0.0, 0.0, 0.0, 1.0,			1.0, 1.0, 0.0,	  // ylw
	   
		0.5, 0.0, 0.0, 1.0,			0.0, 0.0, 0.0,		// blk
		0.5, 0.0, 0.5, 1.0,     	1.0, 0.0, 0.0,		// r
		0.0, 0.0, 0.0, 1.0,			1.0, 1.0, 0.0,	  // ylw
		// right rn X
		0.5, 0.0, 0.0, 1.0,			1.0, 1.0, 0.0,	  // ylw
		0.5, 0.0, 0.5, 1.0,     	1.0, 0.0, 0.0,		// r
		0.5, 0.5, 0.0, 1.0,			0.0, 0.0, 0.0,		// blk
	
		0.5, 0.5, 0.5, 1.0,			0.0, 0.0, 0.0,		// blk
		0.5, 0.0, 0.5, 1.0,     	1.0, 0.0, 0.0,		// r
		0.5, 0.5, 0.0, 1.0,			1.0, 1.0, 0.0,	  // ylw
		//left rn X
	   0.0, 0.0, 0.5, 1.0,			1.0, 1.0, 1.0,		// w
	   0.0, 0.0, 0.0, 1.0,     	0.0, 0.0, 1.0,	  // b
	   0.0, 0.5, 0.5, 1.0,			0.0, 0.0, 0.0,		// blk
	
	   0.0, 0.5, 0.0, 1.0,			0.0, 0.0, 1.0,	  // b
	   0.0, 0.0, 0.0, 1.0,     	1.0, 1.0, 1.0,		// w
	   0.0, 0.5, 0.5, 1.0,			0.0, 0.0, 0.0,		// blk
	   //bottom rn X
	   0.0, 0.0, 0.5, 1.0,			0.5, 0.5, 0.5,		//g
	   0.5, 0.0, 0.5, 1.0,     	1.0, 1.0, 0.0,	  // y
	   0.0, 0.5, 0.5, 1.0,			0.0, 1.0, 1.0,		// cyan
	  
	   0.5, 0.5, 0.5, 1.0,  0.0, 1.0, 0.0, // g    					
	   0.5, 0.0, 0.5, 1.0,  1.0, 0.0, 1.0, // prpl  	
	   0.0, 0.5, 0.5, 1.0,  0.0, 0.0, 0.0, //blk
	   //top rn X
	   0.0, 0.5, 0.0, 1.0,			1.0, 0.0, 0.0,		// r
	   0.5, 0.5, 0.0, 1.0,     	0.0, 1.0, 0.0,	  // g
	   0.0, 0.5, 0.5, 1.0,			0.0, 0.0, 1.0,		// b
	
	   0.5, 0.5, 0.5, 1.0,			.0, 0.0, 1.0,		// b
	   0.5, 0.5, 0.0, 1.0,     	1.0, 0.0, 0.0,		// r
	   0.0, 0.5, 0.5, 1.0,			 	0.0, 1.0, 0.0,	  // g
	]);
}