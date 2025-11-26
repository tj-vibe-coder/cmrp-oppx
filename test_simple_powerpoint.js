/**
 * Test simple PowerPoint generation without complex database queries
 */

const PptxGenJS = require('pptxgenjs');

async function testSimplePowerPoint() {
    console.log('🧪 Testing Simple PowerPoint Generation');
    
    try {
        // Create a simple presentation
        const pres = new PptxGenJS();
        
        // Set presentation properties
        pres.layout = 'LAYOUT_16x9';
        pres.author = 'CMRP Test';
        pres.title = 'Test Weekly Report';
        
        // Add title slide
        const slide1 = pres.addSlide();
        slide1.addText('JMO Weekly Report', {
            x: 1, y: 2, w: 8, h: 1.5,
            fontSize: 36,
            bold: true,
            color: '1f2937',
            align: 'center'
        });
        
        slide1.addText('Week of January 13, 2025', {
            x: 1, y: 3.5, w: 8, h: 1,
            fontSize: 24,
            color: '6b7280',
            align: 'center'
        });
        
        // Add summary slide
        const slide2 = pres.addSlide();
        slide2.addText('Executive Summary', {
            x: 0.5, y: 0.5, w: 9, h: 0.8,
            fontSize: 32,
            bold: true,
            color: '1f2937'
        });
        
        // Summary table
        const tableData = [
            ['Status', 'Count', 'Amount'],
            ['OP100', '25', '$2.5M'],
            ['OP90', '30', '$3.2M'],
            ['OP60', '45', '$4.1M'],
            ['OP30', '87', '$8.7M'],
            ['Submitted', '15', '$1.8M']
        ];
        
        slide2.addTable(tableData, {
            x: 0.5, y: 1.5, w: 9, h: 3,
            fontSize: 14,
            border: { pt: 1, color: '6b7280' }
        });
        
        // Add highlights slide
        const slide3 = pres.addSlide();
        slide3.addText('This Week\'s Highlights', {
            x: 0.5, y: 0.5, w: 9, h: 0.8,
            fontSize: 32,
            bold: true,
            color: '1f2937'
        });
        
        slide3.addText([
            '• 3 new submissions totaling $1.2M',
            '• 5 opportunities advanced to OP90',
            '• 2 major financial updates (+$500K)',
            '• No concerning regressions this week'
        ].join('\n'), {
            x: 0.5, y: 1.5, w: 9, h: 4,
            fontSize: 16,
            bullet: { code: '2022' }
        });
        
        // Generate the file
        console.log('📝 Generating PowerPoint file...');
        const pptBuffer = await pres.write({ outputType: 'nodebuffer' });
        
        console.log('✅ PowerPoint generated successfully!');
        console.log('📊 Buffer size:', pptBuffer.length, 'bytes');
        console.log('💾 File size:', (pptBuffer.length / 1024).toFixed(1), 'KB');
        
        return pptBuffer;
        
    } catch (error) {
        console.error('❌ Error generating PowerPoint:', error.message);
        console.error('Stack:', error.stack);
        throw error;
    }
}

// Run the test
testSimplePowerPoint();